import tempfile
import unittest
from argparse import Namespace
from pathlib import Path
from unittest import mock

from harness import _run_prompt, do_run


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

    def test_run_prompt_retries_exec_format_with_bash(self):
        primary_error = OSError(8, "Exec format error")
        fallback_proc = mock.Mock(stdout="ok", stderr="")

        with mock.patch("subprocess.run", side_effect=[primary_error, fallback_proc]) as run_mock:
            output = _run_prompt(["claude", "-p"], "hello")

        self.assertEqual(output, "ok")
        self.assertEqual(run_mock.call_count, 2)


if __name__ == "__main__":
    unittest.main()
