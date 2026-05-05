"""Workflow runners used by harness.py."""

from __future__ import annotations

import re
import subprocess


def detect_tasks_file() -> tuple[str | None, str | None]:
    result = subprocess.run(["git", "diff", "HEAD^1", "HEAD", "--name-only"], text=True, capture_output=True, check=False)
    for path in result.stdout.splitlines():
        if re.fullmatch(r"changes/[^/]+/tasks\.md", path):
            return path, path.split("/")[1]
    return None, None


def run_shell(command: str) -> int:
    return subprocess.run(["bash", "-lc", command], check=False).returncode


def run_test_scan(mode: str) -> int:
    commands = {
        "dotnet": [
            "dotnet restore CovertOms.sln",
            "dotnet build CovertOms.sln --no-restore --configuration Release",
            "dotnet test CovertOms.sln --no-build --configuration Release --logger trx --results-directory TestResults/",
        ],
        "frontend": [
            "cd frontend && npm ci --frozen-lockfile --ignore-scripts",
            "cd frontend && npm run lint",
            "cd frontend && npm run test -- --run",
            "cd frontend && npm run build",
        ],
        "docker-build": ["docker compose -f infra/docker-compose.yml build"],
    }[mode]

    for command in commands:
        print(f"[harness] {command}")
        code = run_shell(command)
        if code != 0:
            return code
    return 0
