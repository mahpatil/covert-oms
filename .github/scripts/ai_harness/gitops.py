"""Safe git helpers for CI usage."""

from __future__ import annotations

import subprocess


def run_git(*args: str) -> None:
    subprocess.run(["git", *args], check=True)
