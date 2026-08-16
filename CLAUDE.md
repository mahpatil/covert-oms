@../CLAUDE.md

# Covert OMS — Claude Code Instructions

## What This Project Is
Covert is a demo microservices project: a confidential document printing service. Customers submit print jobs, choose a branch location, and the system coordinates printing **without exposing document bytes to the branch**. This is a starter demo to showcase modern microservices architecture.

## Project Structure
```
services/
  order-api/          .NET 8 ASP.NET Core — customer-facing REST API (port 5001)
  print-coordinator/  .NET 8 ASP.NET Core — internal orchestrator (port 5002)
  branch-agent/       .NET 8 ASP.NET Core — simulated branch printer (port 5003)
  token-service/      .NET 8 ASP.NET Core — token vault (port 5004)
frontend/             React + Vite + TypeScript (port 3000)
infra/                Docker Compose + Kind manifests
changes/              opsx proposals (proposal.md + tasks.md per feature)
.github/workflows/    4 CI/CD workflows
```

## Build Commands

### .NET Services
```bash
# From repo root
dotnet restore CovertOms.sln
dotnet build CovertOms.sln
dotnet test CovertOms.sln

# Individual service
cd services/order-api && dotnet run --project src
```

### Frontend
```bash
cd frontend
npm install
npm run dev       # http://localhost:3000
npm run test      # vitest
npm run build
```

### Docker (all services)
```bash
docker compose -f infra/docker-compose.yml up --build
docker compose -f infra/docker-compose.yml down
```

### Kind (local k8s)
```bash
kind create cluster --config infra/kind/cluster-config.yaml --name covert-oms
docker compose -f infra/docker-compose.yml build
kind load docker-image covert-oms-order-api:latest --name covert-oms
kind load docker-image covert-oms-print-coordinator:latest --name covert-oms
kind load docker-image covert-oms-branch-agent:latest --name covert-oms
kind load docker-image covert-oms-frontend:latest --name covert-oms
kubectl apply -f infra/kind/manifests/
kubectl rollout status deployment/order-api -n covert-oms
```

## Service URLs (local dev)
| Service | URL |
|---|---|
| order-api | http://localhost:5001 |
| print-coordinator | http://localhost:5002 |
| branch-agent | http://localhost:5003 |
| frontend | http://localhost:3000 |
| nginx (all) | http://localhost:80 |

## opsx AI Development Workflow
New features flow through the GitHub Actions pipeline:

1. **Create Issue** → label it `feature`
2. **WF1 auto-runs** → `/opsx:explore` + `/opsx:propose` → PR with `changes/{slug}/proposal.md` + `tasks.md`
3. **Review PR** → read proposal.md (arch options) + tasks.md (work list) → merge if happy
4. **WF2 auto-runs** → `/coder tasks.md` → implementation PR
5. **WF3 auto-runs** on PR → dotnet tests + vitest + Trivy + CodeQL
6. **Merge** → WF4 deploys to Kind

## AI CLI Selection
Set the repo variable `AI_CLI` to one of: `claude` (default) | `codex` | `opencode`

## Key Architecture Decision
`print-coordinator` never pushes document bytes to `branch-agent`. The branch-agent must present a short-lived token to **pull** the bytes — which are then deleted after one successful retrieval. See `services/print-coordinator/src/Services/TokenVaultService.cs`.

## Testing
- .NET: xUnit + FluentAssertions + WebApplicationFactory for integration tests
- React: Vitest + React Testing Library
- Run all: `dotnet test CovertOms.sln` and `npm run test --prefix frontend`
