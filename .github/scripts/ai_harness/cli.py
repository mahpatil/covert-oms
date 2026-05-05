"""Provider parsing and command construction."""

from __future__ import annotations

from typing import Mapping

SUPPORTED = {"claude", "codex", "opencode", "gemini", "dummy"}


def provider_from_value(value: str | None) -> str:
    provider = (value or "claude").strip().lower()
    if provider not in SUPPORTED:
        raise ValueError(f"Unsupported provider: {provider}")
    return provider


def required_env_for_provider(provider: str) -> tuple[str, ...]:
    return {
        "claude": ("ANTHROPIC_API_KEY",),
        "codex": ("OPENAI_API_KEY",),
        "opencode": ("OPENCODE_API_KEY",),
        "gemini": ("GEMINI_API_KEY",),
        "dummy": tuple(),
    }[provider]


def command_for_provider(provider: str, env: Mapping[str, str]) -> list[str]:
    if provider == "claude":
        return ["claude", "--allowedTools", "Bash,Read,Edit", "-p"]
    if provider == "codex":
        return ["codex", "exec"]
    if provider == "opencode":
        return ["opencode", "run"]
    if provider == "gemini":
        return ["gemini", "-p"]
    if provider == "dummy":
        return ["python", "-c", "print(\"dummy provider output\")"]
    raise ValueError(f"Unsupported provider: {provider}")
