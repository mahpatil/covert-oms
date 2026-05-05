#!/usr/bin/env python3
"""Workflow harness for explore/propose automation."""

from __future__ import annotations

import argparse
import os
import shlex
import subprocess
from pathlib import Path

from ai_harness.cli import command_for_provider, provider_from_value, required_env_for_provider
from ai_harness.meta import build_branch, build_slug
from ai_harness.runner import ensure_outputs


def _log(message: str) -> None:
    print(f"[harness] {message}")


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
    _log(f"running provider command: {' '.join(command)}")
    try:
        result = subprocess.run(command + [prompt], text=True, capture_output=True, check=False)
        _log(f"provider command completed with exit code {result.returncode}")
        return (result.stdout or "") + ("\n" + result.stderr if result.stderr else "")
    except OSError as exc:
        _log(f"provider command failed with OSError: {exc}")
        if exc.errno == 8 and command:
            _log("detected exec format error; retrying via bash -lc fallback")
            cmdline = " ".join(shlex.quote(part) for part in command + [prompt])
            fallback = subprocess.run(["bash", "-lc", cmdline], text=True, capture_output=True, check=False)
            _log(f"fallback command completed with exit code {fallback.returncode}")
            return (fallback.stdout or "") + ("\n" + fallback.stderr if fallback.stderr else "")
        return f"CLI execution failed: {exc}"


def _dummy_outputs(issue_title: str, issue_body: str) -> tuple[str, str]:
    explore = f"# Dummy Explore Output\n\nIssue: {issue_title}\n\nSummary: {issue_body[:200]}\n"
    propose = (
        f"# Dummy Proposal: {issue_title}\n\n"
        "## Option A\nUse existing workflow with harness orchestration.\n\n"
        "## Option B\nIntroduce phased rollout for provider-specific behavior.\n"
    )
    return explore, propose


def do_meta(args: argparse.Namespace) -> int:
    _log("starting meta mode")
    slug = build_slug(args.issue_title)
    branch = build_branch(args.issue_number, slug)
    _log(f"computed slug={slug} branch={branch}")
    github_output = os.getenv("GITHUB_OUTPUT")
    if github_output:
        _log(f"writing outputs to GITHUB_OUTPUT file: {github_output}")
        with open(github_output, "a", encoding="utf-8") as handle:
            handle.write(f"slug={slug}\n")
            handle.write(f"branch={branch}\n")
    else:
        print(f"slug={slug}")
        print(f"branch={branch}")
    return 0


def do_run(args: argparse.Namespace) -> int:
    _log("starting run mode")
    provider = provider_from_value(args.provider)
    _log(f"selected provider={provider}")
    for name in required_env_for_provider(provider):
        if not os.getenv(name):
            print(f"warning: missing expected credential {name}")
    if provider == "dummy":
        _log("using dummy provider output generation")
        explore, propose = _dummy_outputs(args.issue_title, args.issue_body)
    else:
        cmd = command_for_provider(provider, os.environ)
        _log(f"constructed provider command: {' '.join(cmd)}")
        _log("running explore prompt")
        explore = _run_prompt(cmd, f'/opsx:explore "{args.issue_title}: {args.issue_body}"')
        _log("running propose prompt")
        propose = _run_prompt(cmd, f'/opsx:propose "{args.issue_title}"')
    _log("ensuring output files are written")
    ensure_outputs(args.issue_title, build_slug(args.issue_title), Path(args.workdir), explore, propose)
    _log("run mode completed")
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
