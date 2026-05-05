Now I have a clear picture. Let me map out what we're actually dealing with.

---

## What's Actually Happening

The current flow is entirely in-memory and base64-over-JSON:

```
Browser                    Nginx              Order-API         Print-Coordinator
  │                          │                    │                    │
  │  Read file as            │                    │                    │
  │  ArrayBuffer ────────────┤                    │                    │
  │                          │                    │                    │
  │  btoa(bytes) ────────────┤                    │                    │
  │  (+33% size!)            │                    │                    │
  │                          │                    │                    │
  │  POST /api/orders        │                    │                    │
  │  { documentBase64: "..." }│                   │                    │
  │─────────────────────────▶│                    │                    │
  │                     ⚠ 1MB DEFAULT             │                    │
  │                     NGINX LIMIT               │                    │
  │                          │─────────────────▶  │                    │
  │                          │                    │  Store in          │
  │                          │                    │  ConcurrentDict    │
  │                          │                    │ ──────────────────▶│
  │                          │                    │  (bytes in heap!)  │
```

**The actual failure point:** Nginx's default `client_max_body_size` is **1MB**. A typical PDF is already larger. And base64 encoding adds 33% on top.

**But there are three separate problems layered here:**

| Problem | Limit | Where |
|---|---|---|
| Nginx rejects the request | 1 MB default | `nginx.conf` — no `client_max_body_size` set |
| Base64 overhead | +33% on every file | `SubmitJobForm.tsx:41-42` |
| Entire file held in heap | Unbounded | `TokenVaultService.cs:15` — `ConcurrentDictionary<string, VaultEntry>` |

---

## The Interesting Design Question

The acceptance criteria says "files are chunked and uploaded" — but there are actually two very different things that could mean:

**Path A: Just fix the limits + switch to multipart binary**
```
- Bump nginx client_max_body_size (e.g. 100MB)
- Switch from base64-in-JSON to multipart/form-data
- Remove the 33% base64 overhead
- One HTTP request, streams to server
```
Simplest. But the file still lives entirely in memory at the coordinator, and "chunked" is debatable.

**Path B: True application-layer chunking**
```
Browser splits file → many small POST requests → server reassembles
```
This is what chunked upload usually means. More complex, but gives you:
- Real progress bars
- Resilience to network interruptions
- Each chunk fits through nginx easily (no limit bumps needed for nginx)
- Coordinator assembles before vaulting

**Path C: Streaming (HTTP chunked transfer encoding)**
One request, body streams in chunks. Simpler than Path B, handles the memory pressure problem, but doesn't give progress or resumability.

---

## What I'd Question About the Issue

The issue says "it probably needs to be split" — that framing assumes chunking is the fix. But the *actual* root cause is just that nginx has no configured `client_max_body_size`. A 5MB PDF fails at nginx before any chunking logic would even matter.

So the question is: **what size files do customers actually need to print?**

- If it's "PDFs up to ~50MB" — fixing nginx + switching to multipart binary (Path A) might be entirely sufficient
- If it's "large architectural drawings, high-res images, 200MB+ files" — true chunking (Path B) becomes necessary

---

## What Chunked Upload Would Look Like (if we go Path B)

```
Browser                           Order-API
  │                                    │
  │  POST /api/orders/uploads/start    │
  │  { documentName, totalBytes }      │
  │──────────────────────────────────▶ │
  │  ◀── { uploadId }                  │
  │                                    │
  │  [for each 5MB chunk]              │
  │  POST /api/orders/uploads/{id}     │
  │  Body: binary chunk                │
  │  ?index=0&total=12                 │
  │──────────────────────────────────▶ │
  │  ◀── { received: true }            │
  │                                    │
  │  POST /api/orders/uploads/{id}/done│
  │  { branchId, settings }            │
  │──────────────────────────────────▶ │
  │  ◀── { jobId }                     │
  │                                    │
```

Order-API assembles the chunks, then forwards the complete bytes to print-coordinator exactly as today. The coordinator and branch-agent pipeline is **entirely unchanged** — which satisfies "no impact to file finally printed."

---

## A Few Things Worth Clarifying Before Proposing

1. **What's the target file size?** This determines whether Path A is enough or Path B is needed.

2. **Do we want a progress bar?** Chunking naturally enables one, but it adds frontend complexity.

3. **Where should partial uploads live?** Right now the coordinator uses in-memory `ConcurrentDictionary`. For chunked uploads, the reassembly buffer could live in order-api's memory (fine for demo), or we could use temp files on disk (better for very large files).

4. **Should we also switch from base64 to binary?** If we're touching the upload anyway, it's a good time to remove the 33% overhead — but it means changing the API contract between order-api and coordinator too.

What's your intuition on file size? And does "chunked upload" need to be true multi-request chunking, or would fixing the encoding + limits satisfy the spirit of the issue?
