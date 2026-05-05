"""Metadata helpers for explore/propose workflow."""

from __future__ import annotations

import re


def build_slug(title: str, max_length: int = 50) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    slug = re.sub(r"-+", "-", slug)
    slug = slug[:max_length].strip("-")
    return slug or "issue"


def build_branch(issue_number: int, slug: str) -> str:
    return f"proposal/issue-{issue_number}-{slug}"
