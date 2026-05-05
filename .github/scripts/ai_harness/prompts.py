"""Prompt builders used by harness workflows."""

from __future__ import annotations


def build_explore_prompt(issue_title: str, issue_body: str) -> str:
    return f'/opsx:explore "{issue_title}: {issue_body}"'


def build_propose_prompt(issue_title: str) -> str:
    return f'/opsx:propose "{issue_title}"'


def build_implement_prompt(slug: str, tasks_file: str) -> str:
    return f"""You are running in an automated GitHub Actions workflow.

Please implement the feature described in the approved proposal and task list.

Proposal: `changes/{slug}/proposal.md`
Tasks: `{tasks_file}`

Run: /coder {tasks_file}

Follow test-driven development (red-green-refactor). Write tests first,
then implement. Use the existing patterns in this codebase:
- .NET 8 ASP.NET Core for backend services
- xUnit + FluentAssertions for .NET tests
- React + TypeScript + Vitest for frontend
"""
