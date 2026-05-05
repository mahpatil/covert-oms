# Proposal: Support for Large Files When App Loading

## Problem

The current print job submission flow encodes documents as base64 JSON payloads and has no file size limits configured. This causes several problems:

- **Base64 inflation**: Files are ~33% larger in transit than their raw size
- **Memory pressure**: The entire file is read into memory on both the client and server before any processing starts
- **Silent failures**: Nginx defaults to a 1 MB body limit; larger documents fail with a cryptic 413 error and no user feedback
- **No progress feedback**: The UI gives no indication that a large upload is in progress, making the app appear frozen
- **Backend bottleneck**: `PostAsJsonAsync` forwards the entire base64 blob synchronously to `print-coordinator`, blocking the request thread

The existing code even acknowledges this in a comment: *"In a real system this would be a file upload stream."*

## Goals

- Accept documents up to **50 MB** without errors
- Replace base64 JSON upload with **multipart/form-data streaming**
- Show a real-time **upload progress bar** in the frontend
- Set explicit, documented size limits across nginx, .NET, and the frontend
- Keep the security invariant: `print-coordinator` never pushes bytes to `branch-agent`

## Non-Goals

- Resumable/chunked uploads (appropriate for files > 1 GB; out of scope for a 50 MB target)
- Cloud storage offload (S3/Azure Blob); the token-vault approach is sufficient at this scale
- Document format validation beyond MIME type

## Options Considered

### Option A — Multipart Upload with Streaming (Recommended)

Replace the JSON body with `multipart/form-data`. The .NET controller binds `IFormFile`, streams bytes directly into the token vault, and forwards only a token (not bytes) to `print-coordinator`. The frontend uses `XMLHttpRequest` to stream the upload and report progress via `upload.onprogress`.

**Pros**: Eliminates base64 overhead, streams without buffering the whole file, progress reporting is native to XHR  
**Cons**: Slightly more complex controller binding; requires updating the `SubmitJobRequest` model

### Option B — Increase JSON Body Limit Only

Keep base64 encoding but raise `client_max_body_size` in nginx and `MaxRequestBodySize` in .NET to 70 MB (50 MB × 1.4 for base64 overhead).

**Pros**: Smallest code change  
**Cons**: Does not fix memory pressure, no progress bar possible with `fetch` JSON body, 70 MB JSON body is wasteful

### Option C — Pre-signed Token Upload (Future-ready)

Frontend requests a pre-signed token, uploads directly to an object store, then posts only the token to `order-api`.

**Pros**: Scales to very large files; offloads bandwidth from the API  
**Cons**: Requires an object store; over-engineered for a 50 MB demo target

## Decision

**Option A** — multipart streaming upload. It fixes the root cause (base64 encoding), adds real progress UX, and keeps the architecture simple. Option B is a band-aid. Option C is appropriate for a future production hardening pass.

## Impact

| Area | Change |
|---|---|
| `frontend/src/components/SubmitJobForm.tsx` | Switch to `FormData` + XHR for progress events |
| `services/order-api/src/Controllers/OrdersController.cs` | Accept `IFormFile`; stream into token vault |
| `services/order-api/src/Models/PrintJob.cs` | Remove `DocumentBase64`; add `IFormFile Document` |
| `services/order-api/src/Program.cs` | Set `MaxRequestBodySize = 52_428_800` (50 MB) |
| `infra/nginx/nginx.conf` + `frontend/nginx.conf` | Add `client_max_body_size 50m` |
| Tests | Update unit + integration tests for multipart binding |
