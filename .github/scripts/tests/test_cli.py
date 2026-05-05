import unittest

from ai_harness.cli import provider_from_value, required_env_for_provider


class CliTests(unittest.TestCase):
    def test_provider_defaults_to_claude(self):
        self.assertEqual(provider_from_value(""), "claude")
        self.assertEqual(provider_from_value(None), "claude")

    def test_provider_supports_known_values(self):
        self.assertEqual(provider_from_value("opencode"), "opencode")
        self.assertEqual(provider_from_value("gemini"), "gemini")
        self.assertEqual(provider_from_value("dummy"), "dummy")

    def test_provider_rejects_unknown(self):
        with self.assertRaises(ValueError):
            provider_from_value("mystery")

    def test_required_env(self):
        self.assertIn("OPENAI_API_KEY", required_env_for_provider("codex"))
        self.assertIn("GEMINI_API_KEY", required_env_for_provider("gemini"))
        self.assertEqual(required_env_for_provider("dummy"), tuple())


if __name__ == "__main__":
    unittest.main()
