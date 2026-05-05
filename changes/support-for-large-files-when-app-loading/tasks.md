# Tasks: Support for Large Files When App Loading

## Implementation Checklist

### Infra / Config
- [ ] Add `client_max_body_size 50m;` to `infra/nginx/nginx.conf` inside the `http {}` block
- [ ] Add `client_max_body_size 50m;` to `frontend/nginx.conf` inside the `server {}` block

### Backend — order-api
- [ ] Configure `FormOptions.MultipartBodyLengthLimit = 52_428_800` and `Kestrel MaxRequestBodySize = 52_428_800` in `services/order-api/src/Program.cs`
- [ ] Update `services/order-api/src/Models/PrintJob.cs`: remove `DocumentBase64` property from `SubmitJobRequest`; update any related `PrintJob` model fields
- [ ] Rewrite `OrdersController.SubmitJob` in `services/order-api/src/Controllers/OrdersController.cs`:
  - Change binding from `[FromBody] SubmitJobRequest` to `[FromForm]` parameters + `IFormFile document`
  - Add `[RequestSizeLimit(52_428_800)]` attribute
  - Validate `document` is non-null and within size limit before processing
  - Stream `document.OpenReadStream()` into `TokenVaultService` (or equivalent vault call)
  - Forward only the token (not bytes) to `print-coordinator`

### Frontend
- [ ] In `frontend/src/components/SubmitJobForm.tsx`:
  - Add client-side 50 MB file size guard (show error and return early if exceeded)
  - Replace `fetch` JSON call with `XMLHttpRequest` posting a `FormData` object
  - Wire `xhr.upload.onprogress` to update a `progress` state variable (0–100)
  - Remove base64 encoding logic (`FileReader.readAsArrayBuffer` → base64 conversion)
- [ ] Add a progress indicator element to `SubmitJobForm.tsx` that renders while `progress > 0 && progress < 100`
- [ ] Update `frontend/src/api/orders.ts` (or equivalent API module) to remove `documentBase64` field from the request type

### Tests
- [ ] Update `services/order-api/tests/` controller unit tests: replace `SubmitJobRequest` JSON body with mocked `IFormFile`; assert vault is called and token is forwarded
- [ ] Update `services/order-api/tests/` integration tests: use `MultipartFormDataContent` in `WebApplicationFactory`; send a small in-memory file and assert `202 Accepted`
- [ ] Add integration test: send a payload exceeding 50 MB and assert `400 Bad Request` or `413 Request Entity Too Large`
- [ ] Update `frontend/src/components/SubmitJobForm.test.tsx`:
  - Mock `XMLHttpRequest` with `vi.spyOn`
  - Assert progress bar renders during upload
  - Assert success state after upload completes
  - Assert error message when file exceeds 50 MB
