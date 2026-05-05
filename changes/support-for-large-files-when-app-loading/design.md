# Design: Support for Large Files When App Loading

## Architecture Overview

The change replaces the current base64-JSON upload path with a multipart/form-data streaming path. Document bytes never accumulate in memory as a string; they flow from the browser through nginx into the .NET controller and are written directly into the in-memory token vault.

```
Browser (FormData + XHR)
  → nginx (client_max_body_size 50m)
    → order-api (IFormFile, MaxRequestBodySize 50 MB)
      → TokenVaultService.StoreAsync(stream)
        → order-api returns { orderId, pullToken }
          → print-coordinator fetches bytes via pull token
            → branch-agent receives bytes (existing flow, unchanged)
```

The security invariant is preserved: `print-coordinator` still never pushes bytes; `branch-agent` presents a token to pull.

## Component Changes

### Frontend — `SubmitJobForm.tsx`

Replace the `fetch` JSON call with `XMLHttpRequest` posting a `FormData` object.

```ts
// Before
const body = JSON.stringify({ documentName, branchId, documentBase64, settings });
const res = await fetch('/api/orders', { method: 'POST', body });

// After
const form = new FormData();
form.append('documentName', documentName);
form.append('branchId', branchId);
form.append('document', file);          // raw File — no base64
form.append('settings', JSON.stringify(settings));

const xhr = new XMLHttpRequest();
xhr.upload.onprogress = (e) => {
  if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
};
xhr.open('POST', '/api/orders');
xhr.send(form);
```

Add a `<progress>` element (or styled `<div>`) that renders only while `progress > 0 && progress < 100`.

Add a client-side guard before submitting:

```ts
const MAX_FILE_BYTES = 50 * 1024 * 1024;
if (file.size > MAX_FILE_BYTES) {
  setError('File must be 50 MB or smaller.');
  return;
}
```

### Backend — `order-api`

**`Models/PrintJob.cs`** — Remove `DocumentBase64`; the file arrives as `IFormFile` bound directly on the controller action, not as a model property (multipart binding works per-parameter).

**`Controllers/OrdersController.cs`**

```csharp
[HttpPost]
[RequestSizeLimit(52_428_800)]
public async Task<IActionResult> SubmitJob(
    [FromForm] string documentName,
    [FromForm] Guid branchId,
    IFormFile document,
    [FromForm] string? settings = null)
{
    if (document is null || document.Length == 0)
        return BadRequest("Document file is required.");

    if (document.Length > 52_428_800)
        return BadRequest("File must be 50 MB or smaller.");

    await using var stream = document.OpenReadStream();
    var token = await _tokenVault.StoreAsync(documentName, stream);

    // Forward token (not bytes) to print-coordinator
    var job = new PrintJob { ... Token = token };
    await _printCoordinator.DispatchAsync(job);
    return Accepted(new { orderId = job.Id });
}
```

**`Program.cs`** — Configure Kestrel and form options:

```csharp
builder.Services.Configure<FormOptions>(o => {
    o.MultipartBodyLengthLimit = 52_428_800;
});
builder.WebHost.ConfigureKestrel(k => {
    k.Limits.MaxRequestBodySize = 52_428_800;
});
```

### Nginx

Both `infra/nginx/nginx.conf` and `frontend/nginx.conf` need:

```nginx
client_max_body_size 50m;
```

Place this inside the `http {}` block (or the relevant `server {}` block if it needs to be scoped).

## Data Flow — Before vs After

| Step | Before | After |
|---|---|---|
| File read | `FileReader.readAsArrayBuffer` → base64 string (33% larger) | `File` object passed directly to `FormData` |
| Wire format | JSON `{"documentBase64": "..."}` | multipart/form-data binary part |
| Server binding | `[FromBody] SubmitJobRequest` with string field | `IFormFile document` per-parameter |
| Memory usage | Full base64 string allocated in JS + .NET | Streamed; never fully buffered |
| Progress tracking | Not possible with `fetch` body | Native `xhr.upload.onprogress` |

## Testing

- **Unit**: Mock `IFormFile` in controller tests; assert `TokenVaultService.StoreAsync` is called with the correct stream.
- **Integration**: Use `MultipartFormDataContent` in `WebApplicationFactory` tests; send a 1 MB in-memory file and assert `202 Accepted`.
- **Frontend**: Vitest + RTL tests mock `XMLHttpRequest` using `vi.spyOn`; assert progress state updates and final success state.
- **Limit tests**: Send a file just over 50 MB and assert the frontend returns an error before making any network call.
