#!/usr/bin/env python3
"""Workflow harness for explore/propose automation."""

from __future__ import annotations

import argparse
import os
import subprocess
from pathlib import Path

from ai_harness.cli import command_for_provider, provider_from_value, required_env_for_provider
from ai_harness.meta import build_branch, build_slug
from ai_harness.runner import ensure_outputs


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["meta", "run", "commit"], required=True)
    parser.add_argument("--provider", default="claude")
    parser.add_argument("--issue-title", required=True)
    parser.add_argument("--issue-number", type=int, required=True)
    parser.add_argument("--issue-body", default="")
    parser.add_argument("--workdir", default=".")
    return parser.parse_args()


def _run_prompt(command: list[str], prompt: str) -> str:
    try:
        result = subprocess.run(command + [prompt], text=True, capture_output=True, check=False)
        return (result.stdout or "") + ("\n" + result.stderr if result.stderr else "")
    except OSError as exc:
        return f"CLI execution failed: {exc}"


def do_meta(args: argparse.Namespace) -> int:
    slug = build_slug(args.issue_title)
    branch = build_branch(args.issue_number, slug)
    github_output = os.getenv("GITHUB_OUTPUT")
    if github_output:
        with open(github_output, "a", encoding="utf-8") as handle:
            handle.write(f"slug={slug}\n")
            handle.write(f"branch={branch}\n")
    else:
        print(f"slug={slug}")
        print(f"branch={branch}")
    return 0


def do_run(args: argparse.Namespace) -> int:
    provider = provider_from_value(args.provider)
    for name in required_env_for_provider(provider):
        if not os.getenv(name):
            print(f"warning: missing expected credential {name}")
    cmd = command_for_provider(provider, os.environ)
    explore = _run_prompt(cmd, f'/opsx:explore "{args.issue_title}: {args.issue_body}"')
    propose = _run_prompt(cmd, f'/opsx:propose "{args.issue_title}"')
    ensure_outputs(args.issue_title, build_slug(args.issue_title), Path(args.workdir), explore, propose)
    return 0


def main() -> int:
    args = parse_args()
    if args.mode == "meta":
        return do_meta(args)
    if args.mode == "run":
        return do_run(args)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
