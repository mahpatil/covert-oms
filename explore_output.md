Now I have a clear picture of the current architecture. Let me map it out and dig into the problem space.

---

## What's Actually Happening Right Now

```
Browser                  order-api              print-coordinator        branch-agent
  │                          │                        │                       │
  │  ① Read entire file      │                        │                       │
  │  ② Convert to base64     │                        │                       │
  │  ③ JSON POST ──────────▶ │                        │                       │
  │    { documentBase64: ... }│                        │                       │
  │                          │  ④ Forward base64 ───▶ │                       │
  │                          │                        │  ⑤ decode → bytes     │
  │                          │                        │  ⑥ Store in memory    │
  │                          │                        │  ⑦ issue token ──────▶│
  │                          │                        │                       │ ⑧ pull bytes
  │                          │                        │ ◀─── GET /documents/{token}
  │                          │                        │  ⑨ bytes destroyed    │
```

The file is **fully materialized in memory** at every hop, encoded as base64 the whole way. Here's where things break:

| Layer | Limit | Why |
|---|---|---|
| Nginx | **1 MB** (default `client_max_body_size`) | This is the immediate wall |
| Browser memory | No limit, but slow | Base64 adds ~33% overhead |
| ASP.NET | ~30 MB default | Not the bottleneck yet |
| TokenVaultService | RAM only | Holds full bytes in-memory, 5min TTL |

---

## The Interesting Questions

**1. What's "large" for this use case?**

Print jobs are typically PDFs. A low-res 10-page doc might be 500KB. A high-res architectural drawing could be 50MB+. The fix strategy changes significantly depending on whether you're targeting 5MB, 50MB, or 500MB.

Do we know what customers actually need? Or are we designing for a reasonable upper bound?

**2. Is chunking the right fix, or is it the symptom of fixing the wrong thing?**

The issue says "probably needs to be split" — but splitting is a *technique*, not a goal. Let me surface a few distinct problems that chunking solves (or doesn't):

```
Problem A: Single HTTP request too large
  → Fix: chunked upload OR just raise nginx limit + use multipart

Problem B: No progress feedback for users
  → Fix: chunked upload (allows progress tracking)

Problem C: Memory pressure on server for large files
  → Fix: streaming OR chunked reassembly to disk

Problem D: Upload resumability (if network drops mid-upload)
  → Fix: chunked upload with session tracking
```

The acceptance criteria says "files are chunked and uploaded" — so chunking is explicitly wanted. But it's worth knowing *why*, because it shapes the design.

**3. The base64 problem is independent and worth fixing regardless**

Right now: `file bytes → base64 string → JSON → network → base64 string → decode → bytes`

The 33% overhead is wasted bandwidth, and encoding/decoding a large file in the browser is slow. Switching to `multipart/form-data` is largely independent of chunking and solves a real problem.

---

## A Few Paths to Consider

```
Option A: Minimal fix
  ┌─────────────────────────────────────────────────────┐
  │ • Raise nginx client_max_body_size (e.g., 100MB)    │
  │ • Switch to multipart upload (no base64)            │
  │ • Pros: simple, few changes                         │
  │ • Cons: no progress, no resumability, memory spike  │
  └─────────────────────────────────────────────────────┘

Option B: Chunked upload (matches acceptance criteria)
  ┌─────────────────────────────────────────────────────┐
  │ • Frontend splits file into N chunks (e.g., 2MB ea) │
  │ • Upload chunks sequentially (or parallel)          │
  │ • Server accumulates chunks, reassembles            │
  │ • Pros: progress bars, resumable, memory-friendly   │
  │ • Cons: needs chunk session management              │
  └─────────────────────────────────────────────────────┘

Option C: Streaming (more elegant, more complex)
  ┌─────────────────────────────────────────────────────┐
  │ • Single request but streamed through all services  │
  │ • ASP.NET IFormFile streaming                       │
  │ • nginx proxy_request_buffering off                 │
  │ • Pros: no chunking logic, truly scalable           │
  │ • Cons: complex plumbing, harder to show progress   │
  └─────────────────────────────────────────────────────┘
```

Option B (chunked upload) is almost certainly the right call given the acceptance criteria — and it's a well-understood pattern.

---

## A Chunked Upload Design Sketch

```
Browser                                    order-api
  │                                            │
  │  POST /api/uploads/init                    │
  │  { filename, totalSize, chunkSize } ──────▶│
  │  ◀────────────────── { uploadId: "abc" }   │
  │                                            │
  │  PUT /api/uploads/abc/chunks/0 ───────────▶│ (chunk bytes, no base64)
  │  PUT /api/uploads/abc/chunks/1 ───────────▶│
  │  PUT /api/uploads/abc/chunks/N ───────────▶│
  │                                            │
  │  POST /api/uploads/abc/complete ──────────▶│
  │                                            │  ─ reassemble
  │                                            │  ─ forward to coordinator
  │  POST /api/orders ─────────────────────────▶│  (reference uploadId, not bytes)
  │  { branchId, uploadId, settings }          │
```

The important constraint: **the TokenVaultService architecture must be preserved** — branch-agent always pulls via token, never receives bytes directly.

---

## Things I'd Want to Know Before Proposing

1. **Target file size** — 10MB? 100MB? Shapes chunk size and timeout configuration.
2. **Should we store chunks to disk or memory?** — In-memory reassembly works up to a point; for very large files, temp files on disk are safer.
3. **Is upload resumability required?** — That needs persistent chunk tracking (e.g., a database or file system), not just in-memory state.
4. **Do we want a progress bar in the frontend?** — Strongly implied but not stated. This is a big UX win from chunking.

What's the actual target size range you have in mind? That would help sharpen which approach makes most sense.
