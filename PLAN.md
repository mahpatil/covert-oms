# Covert OMS — Implementation Plan

## Overall Status: COMPLETE ✓
All phases implemented and pushed to https://github.com/mahpatil/covert-oms

---

## Context

Build a demo project for "Covert" — an imaginary confidential document printing service — to showcase modern microservices architecture (.NET 8 + React) with a fully automated GitHub Actions CI/CD pipeline driven by AI skills (opsx pattern). Simple in-memory logic only; no databases.

---

## Architecture

### 3 Microservices + 1 Frontend

| Service | Port | Role |
|---|---|---|
| `order-api` | 5001 | Customer-facing REST API. Accepts print jobs, returns status. |
| `print-coordinator` | 5002 | Internal orchestrator. Issues short-lived tokens; stores bytes. |
| `branch-agent` | 5003 | Simulates a branch printer. Pulls doc via token, mocks print. |
| `frontend` | 3000 | React/Vite UI. Submit jobs, pick branch, track status. |

### Key Architectural Story: Pull-not-Push Confidentiality

The `branch-agent` **never receives document bytes directly**. The coordinator issues a short-lived token; branch-agent presents the token to retrieve bytes — which are then **destroyed on first read** from a `ConcurrentDictionary` with TTL.

**Call flow:**
```
Browser → order-api → print-coordinator → branch-agent (notify: jobId + token)
                            ↑
               branch-agent calls back → presents token → gets bytes → prints → done
```

**Inter-service comms:** Simple HTTP REST via typed `HttpClient` (seam is ready for Azure Service Bus swap in future).

---

## Folder Structure (as built)

```
covert-oms/
├── .github/
│   ├── actions/install-ai-cli/action.yml   ✓ Codex/OpenCode only — Claude uses action
│   ├── workflows/
│   │   ├── explore-and-propose.yml         ✓ WF1: Issue → proposal PR
│   │   ├── implement.yml                   ✓ WF2: Proposal merged → implementation PR
│   │   ├── test-and-scan.yml               ✓ WF3: PR → tests + security scans
│   │   └── deploy.yml                      ✓ WF4: Tests pass → Kind deploy
│   └── ISSUE_TEMPLATE/feature.md           ✓
├── changes/.gitkeep                         ✓ opsx proposals land here
├── services/
│   ├── order-api/src/ + tests/ + Dockerfile ✓
│   ├── print-coordinator/src/ + tests/ + Dockerfile ✓
│   └── branch-agent/src/ + tests/ + Dockerfile ✓
├── frontend/src/ + tests/ + Dockerfile      ✓
├── infra/
│   ├── docker-compose.yml                   ✓
│   ├── nginx/nginx.conf                     ✓
│   └── kind/cluster-config.yaml + manifests/ ✓
├── CovertOms.sln                            ✓
├── CLAUDE.md                                ✓
├── README.md                                ✓
├── PLAN.md                                  ✓ (this file)
└── .gitignore                               ✓
```

---

## 4 GitHub Actions Workflows

### Multi-CLI Support
- `AI_CLI` repo variable: `claude` (default) | `codex` | `opencode`
- **Claude** → uses `anthropics/claude-code-action@v1` (no manual CLI install needed)
- **Codex/OpenCode** → uses `.github/actions/install-ai-cli` composite action

| CLI | Secret needed |
|---|---|
| `claude` | `ANTHROPIC_API_KEY` |
| `codex` | `OPENAI_API_KEY` |
| `opencode` | `OPENCODE_API_KEY` |

---

### WF1: `explore-and-propose.yml` ✓
- **Trigger:** `issues: [labeled]` where label = `feature`
- **Claude path:** `anthropics/claude-code-action@v1` with prompt running `/opsx:explore` + `/opsx:propose`
- **Other CLIs:** manual install + CLI invocation
- **Output:** PR with `changes/{slug}/proposal.md` + `changes/{slug}/tasks.md`
- **Human gate:** reviewer must read both files before merging

### WF2: `implement.yml` ✓
- **Trigger:** `push` to `main` with path filter `changes/**/tasks.md`
- **Claude path:** `anthropics/claude-code-action@beta` with prompt running `/coder tasks.md`
- **Other CLIs:** manual install + CLI invocation
- **Output:** implementation PR on branch `feat/implement-{slug}`
- **Human gate:** reviewer must approve implementation before merging

### WF3: `test-and-scan.yml` ✓
- **Trigger:** `pull_request` targeting `main`
- **Jobs (run in parallel):**
  - `dotnet-tests` — restore → build → `dotnet test --logger trx` → upload TestResults artifact
  - `frontend-tests` — npm ci → ESLint → vitest → vite build
  - `trivy-scan` — docker compose build → Trivy HIGH/CRITICAL → SARIF upload to Security tab
  - `codeql-scan` — CodeQL (csharp + javascript) → analyze

### WF4: `deploy.yml` ✓
- **Trigger:** `workflow_run` on "Test and Scan" completed with success on `main`
- **Steps:** install Kind + kubectl → create cluster from `infra/kind/cluster-config.yaml` → docker compose build → `kind load docker-image` × 4 → `kubectl apply -f infra/kind/manifests/` → rollout status → curl smoke test → cleanup cluster

---

## Implementation Phases

### Phase 1 — Foundation ✓

| File | Status | Notes |
|---|---|---|
| `CLAUDE.md` | ✓ | Build commands, service URLs, opsx workflow docs |
| `.gitignore` | ✓ | .NET + Node + Docker patterns |
| `CovertOms.sln` | ✓ | 6 projects: 3 services + 3 test projects |
| `changes/.gitkeep` | ✓ | Placeholder for opsx proposal folder |
| `README.md` | ✓ | Architecture overview + quick start + pipeline guide |

---

### Phase 2 — Workflows ✓

| File | Status | Notes |
|---|---|---|
| `.github/actions/install-ai-cli/action.yml` | ✓ | Codex/OpenCode only; Claude uses `claude-code-action` |
| `.github/workflows/explore-and-propose.yml` | ✓ | `claude-code-action` for Claude; manual for others |
| `.github/workflows/implement.yml` | ✓ | `claude-code-action` for Claude; manual for others |
| `.github/workflows/test-and-scan.yml` | ✓ | 4 parallel jobs |
| `.github/workflows/deploy.yml` | ✓ | `workflow_run` trigger on test success |
| `.github/ISSUE_TEMPLATE/feature.md` | ✓ | Reminds user to add `feature` label |

---

### Phase 3 — Services ✓

#### order-api

| File | Status | Notes |
|---|---|---|
| `src/Program.cs` | ✓ | Minimal API, DI, CORS, Swagger |
| `src/Controllers/OrdersController.cs` | ✓ | `POST /api/orders`, `GET /api/orders/{id}`, `GET /api/branches` |
| `src/Models/PrintJob.cs` | ✓ | `PrintJob`, `SubmitJobRequest`, `PrintSettings`, `Branch`, `JobStatus` |
| `src/order-api.csproj` | ✓ | .NET 8 SDK Web |
| `tests/OrderApi.Tests.csproj` | ✓ | xUnit + FluentAssertions + WebApplicationFactory |
| `tests/OrdersControllerTests.cs` | ✓ | 6 integration tests: branches, submit, unknown branch, missing name, unknown job, health |
| `Dockerfile` | ✓ | `sdk:8.0` build → `aspnet:8.0` runtime, non-root, port 8080 |

#### print-coordinator

| File | Status | Notes |
|---|---|---|
| `src/Program.cs` | ✓ | Singleton `TokenVaultService`, `VaultCleanupService` background worker |
| `src/Controllers/JobsController.cs` | ✓ | `POST /internal/jobs` (accept + token issue), `GET /internal/jobs/documents/{token}` (single-use retrieval) |
| `src/Models/CoordinatorModels.cs` | ✓ | `IncomingJob`, `PrintNotification`, `PrintSettings` |
| `src/Services/TokenVaultService.cs` | ✓ | **Core confidentiality logic** — Store/Retrieve/IsValid/PurgeExpired, TTL 5 min, bytes destroyed on retrieval |
| `src/print-coordinator.csproj` | ✓ | .NET 8 SDK Web |
| `tests/PrintCoordinator.Tests.csproj` | ✓ | xUnit + FluentAssertions |
| `tests/TokenVaultServiceTests.cs` | ✓ | 7 unit tests: token issued, retrieve+purge, unknown token, expired token, IsValid, PurgeExpired |
| `Dockerfile` | ✓ | `sdk:8.0` → `aspnet:8.0`, non-root, port 8080 |

#### branch-agent

| File | Status | Notes |
|---|---|---|
| `src/Program.cs` | ✓ | Singleton `MockPrinterService`, HttpClient to coordinator |
| `src/Controllers/PrintController.cs` | ✓ | `POST /print/{branchId}` — receives token, pulls bytes, prints, discards |
| `src/Models/BranchModels.cs` | ✓ | `PrintNotification`, `PrintSettings` |
| `src/Services/MockPrinterService.cs` | ✓ | Logs print, returns `PrintResult`, bytes go out of scope immediately |
| `src/branch-agent.csproj` | ✓ | .NET 8 SDK Web |
| `tests/BranchAgent.Tests.csproj` | ✓ | xUnit + FluentAssertions |
| `tests/MockPrinterServiceTests.cs` | ✓ | 4 unit tests: success, multi-copy pages, completion time, health endpoint |
| `Dockerfile` | ✓ | `sdk:8.0` → `aspnet:8.0`, non-root, port 8080 |

---

### Phase 4 — Infra ✓

| File | Status | Notes |
|---|---|---|
| `infra/docker-compose.yml` | ✓ | 4 services + nginx + `covert-net`, healthchecks on all |
| `infra/nginx/nginx.conf` | ✓ | `/api/*` → order-api:8080, `/` → frontend:80 |
| `infra/kind/cluster-config.yaml` | ✓ | Single-node, extraPortMappings 30000–30003 → hosts 3000–5003 |
| `infra/kind/manifests/namespace.yaml` | ✓ | `covert-oms` namespace |
| `infra/kind/manifests/order-api.yaml` | ✓ | Deployment + NodePort 30001, readiness probe |
| `infra/kind/manifests/print-coordinator.yaml` | ✓ | Deployment + NodePort 30002, readiness probe |
| `infra/kind/manifests/branch-agent.yaml` | ✓ | Deployment + NodePort 30003, readiness probe |
| `infra/kind/manifests/frontend.yaml` | ✓ | Deployment + NodePort 30000 |

---

### Phase 5 — Frontend ✓

| File | Status | Notes |
|---|---|---|
| `src/api/client.ts` | ✓ | Typed fetch wrappers: `getBranches`, `submitJob`, `getJob` |
| `src/components/BranchSelector.tsx` | ✓ | Fetches branches on mount, controlled select |
| `src/components/SubmitJobForm.tsx` | ✓ | File picker, branch selector, copies/colour/paper settings, base64 encode |
| `src/components/SubmitJobForm.test.tsx` | ✓ | 4 tests: renders, no file error, no branch error, success → `onSubmitted` |
| `src/components/OrderStatus.tsx` | ✓ | Polls `getJob` every 2s until Done/Failed |
| `src/components/OrderStatus.test.tsx` | ✓ | 4 tests: renders job info, Done label, Failed label, polling |
| `src/App.tsx` | ✓ | Toggle between form and status view |
| `src/main.tsx` | ✓ | React 18 root |
| `src/test-setup.ts` | ✓ | `@testing-library/jest-dom` import |
| `vite.config.ts` | ✓ | Dev proxy `/api` → localhost:5001, vitest jsdom config |
| `tsconfig.json` | ✓ | Strict TS, react-jsx |
| `package.json` | ✓ | React 18, Vite 5, Vitest 1, RTL, ESLint |
| `Dockerfile` | ✓ | `node:20-alpine` build → `nginx:alpine` serve |
| `nginx.conf` | ✓ | SPA fallback (`try_files` → `/index.html`) |
| `index.html` | ✓ | Vite entry point |

---

## Verification Checklist

### Local Dev
- [ ] `docker compose -f infra/docker-compose.yml up --build` — all 4 containers healthy
- [ ] `curl http://localhost:5001/api/branches` — returns 4 branches (London, Manchester, Edinburgh, Birmingham)
- [ ] Submit print job via `http://localhost:3000` — status transitions: Pending → Coordinating → Printing → Done
- [ ] `http://localhost:5001/swagger` — order-api Swagger UI loads

### Tests
- [ ] `dotnet restore CovertOms.sln && dotnet test CovertOms.sln` — all tests pass
- [ ] `cd frontend && npm install && npm run test` — all vitest tests pass
- [ ] `cd frontend && npm run lint` — no lint errors
- [ ] `cd frontend && npm run build` — builds without errors

### AI Pipeline (GitHub)
- [ ] Add `ANTHROPIC_API_KEY` to repo secrets
- [ ] Create an Issue, add label `feature` → WF1 opens proposal PR with `changes/{slug}/proposal.md` + `tasks.md`
- [ ] Review and merge proposal PR → WF2 opens implementation PR
- [ ] Open any PR → WF3 runs: dotnet tests ✓, frontend tests ✓, Trivy scan ✓, CodeQL ✓
- [ ] Merge to main after tests pass → WF4 deploys to Kind, smoke test passes

### Kind Deploy
- [ ] `kind create cluster --config infra/kind/cluster-config.yaml --name covert-oms`
- [ ] `docker compose -f infra/docker-compose.yml build`
- [ ] `kind load docker-image covert-oms-order-api:latest --name covert-oms` (× 4)
- [ ] `kubectl apply -f infra/kind/manifests/`
- [ ] `kubectl rollout status deployment/order-api -n covert-oms`

---

## opsx Pipeline Flow

```
GitHub Issue (labeled: feature)
        │
        ▼ WF1: explore-and-propose.yml
  claude-code-action:
    /opsx:explore "issue title + body"
    /opsx:propose "issue title"
        │
        ▼ opens PR
  changes/{slug}/
    proposal.md   ← architectural options + recommended approach
    tasks.md      ← ordered implementation task list
        │
        ▼ human reviews + merges PR
  WF2: implement.yml
        │
        ▼ claude-code-action: /coder tasks.md
  feat/implement-{slug} branch
        │
        ▼ opens PR
  WF3: test-and-scan.yml (auto on PR)
    dotnet-tests ──┐
    frontend-tests ├── parallel
    trivy-scan ────┤
    codeql-scan ───┘
        │
        ▼ all pass → human merges
  WF4: deploy.yml
        │
        ▼ Kind cluster
  kubectl apply → rollout → smoke test → done
```

---

## Commit History

| Hash | Message |
|---|---|
| `11fda00` | feat: initial Covert OMS microservices demo (56 files, 2422 lines) |
| `02c3af6` | refactor: use anthropics/claude-code-action for Claude workflow path |
| `815238d` | docs: add README with architecture overview and pipeline guide |
