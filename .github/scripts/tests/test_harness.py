import tempfile
import unittest
from argparse import Namespace
from pathlib import Path

from harness import do_run


class HarnessTests(unittest.TestCase):
    def test_dummy_provider_generates_sample_outputs(self):
        with tempfile.TemporaryDirectory() as tmp:
            args = Namespace(
                provider="dummy",
                issue_title="Dummy Issue",
                issue_number=1,
                issue_body="Validate offline path",
                workdir=tmp,
            )
            code = do_run(args)
            self.assertEqual(code, 0)
            proposal = Path(tmp) / "changes/dummy-issue/proposal.md"
            self.assertTrue(proposal.exists())
            self.assertIn("Dummy Proposal", proposal.read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
