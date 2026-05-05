"""Explore/propose execution and output normalization."""

from __future__ import annotations

from pathlib import Path


def _write_if_missing(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists():
        path.write_text(content, encoding="utf-8")


def ensure_outputs(
    issue_title: str,
    slug: str,
    working_dir: Path,
    explore_text: str,
    propose_text: str,
) -> None:
    explore = working_dir / "explore_output.md"
    proposal = working_dir / f"changes/{slug}/proposal.md"
    tasks = working_dir / f"changes/{slug}/tasks.md"

    _write_if_missing(explore, explore_text or "# Explore output\n")
    _write_if_missing(proposal, propose_text or f"# Proposal: {issue_title}\n")
    _write_if_missing(tasks, f"# Tasks: {issue_title}\n\n- [ ] Review proposal\n")
