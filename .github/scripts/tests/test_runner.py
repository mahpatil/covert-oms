import tempfile
import unittest
from pathlib import Path

from ai_harness.runner import ensure_outputs


class RunnerTests(unittest.TestCase):
    def test_ensure_outputs_creates_missing_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            ensure_outputs(
                issue_title="My Issue",
                slug="my-issue",
                working_dir=base,
                explore_text="explore data",
                propose_text="propose data",
            )
            self.assertTrue((base / "explore_output.md").exists())
            self.assertTrue((base / "changes/my-issue/proposal.md").exists())
            self.assertTrue((base / "changes/my-issue/tasks.md").exists())


if __name__ == "__main__":
    unittest.main()
