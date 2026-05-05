import unittest

from ai_harness.meta import build_slug, build_branch


class MetaTests(unittest.TestCase):
    def test_build_slug_normalizes_and_limits_length(self):
        title = "Hello, World! this should be CLEANED and cut beyond fifty chars"
        slug = build_slug(title)
        self.assertEqual(slug, "hello-world-this-should-be-cleaned-and-cut-beyond")
        self.assertLessEqual(len(slug), 50)

    def test_build_slug_fallback(self):
        self.assertEqual(build_slug("***"), "issue")

    def test_build_branch(self):
        self.assertEqual(build_branch(12, "my-slug"), "proposal/issue-12-my-slug")


if __name__ == "__main__":
    unittest.main()
