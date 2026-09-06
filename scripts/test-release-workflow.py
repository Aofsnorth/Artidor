"""Run offline release workflow regressions: python scripts/test-release-workflow.py.

Execute the actual YAML run block in Bash, mocking only release API calls and
local tag existence. No GitHub credentials, remote writes, or tag changes occur.
Set RELEASE_TEST_BASH to the Git Bash executable on Windows if PATH selects WSL.
"""

import os
from pathlib import Path
import subprocess
import textwrap
import unittest


BASH = os.environ.get("RELEASE_TEST_BASH", "bash")
ROOT = Path(__file__).resolve().parents[1]
WORKFLOW = (ROOT / ".github/workflows/release.yml").read_text(encoding="utf-8")
RUN_BLOCK = textwrap.dedent(WORKFLOW.split("        run: |\n", 1)[1])
MOCKS = r"""
git() {
  if [[ "$1" == show-ref ]]; then
    return "$TAG_STATUS"
  fi
  command git "$@"
}
gh() {
  printf 'GH_CALL' >&2
  printf ' <%s>' "$@" >&2
  printf '\n' >&2
  if [[ "$1" == api ]]; then
    printf '%s\n' "$RELEASE_TAGS_MOCK"
    return "$API_STATUS"
  fi
  if [[ "$1" == release && "$2" == create ]]; then
    return "$CREATE_STATUS"
  fi
  return 99
}
"""


class ReleaseWorkflowTests(unittest.TestCase):
    def run_release(self, **overrides):
        environment = {
            **os.environ,
            "TAG": "v1.2.3",
            "GH_REPO": "example/artidor",
            "EVENT_NAME": "push",
            "TAG_STATUS": "0",
            "API_STATUS": "0",
            "CREATE_STATUS": "0",
            "RELEASE_TAGS_MOCK": "",
            **overrides,
        }
        return subprocess.run(
            [BASH, "--noprofile", "--norc", "-e", "-o", "pipefail", "-s"],
            input=MOCKS + RUN_BLOCK,
            text=True,
            capture_output=True,
            cwd=ROOT,
            env=environment,
            timeout=10,
            check=False,
        )

    def test_existing_release_is_read_only(self):
        result = self.run_release(RELEASE_TAGS_MOCK="v0.1.0\nv1.2.3\nv2.0.0")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("leaving metadata and assets unchanged", result.stdout)
        self.assertEqual(result.stderr.count("GH_CALL"), 1)
        self.assertIn("<--paginate>", result.stderr)

    def test_absent_release_is_created_with_verified_tag(self):
        for tag, flag in [("v1.2.3", "--latest"), ("v1.2.3-beta", "--prerelease")]:
            with self.subTest(tag=tag):
                result = self.run_release(TAG=tag, RELEASE_TAGS_MOCK="v1x2x3\nv1.2.30")
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertIn(f"<release> <create> <{tag}>", result.stderr)
                self.assertIn("<--verify-tag>", result.stderr)
                self.assertIn(f"<{flag}>", result.stderr)
                self.assertIn("<--generate-notes>", result.stderr)

    def test_manual_stable_backfill_does_not_replace_latest(self):
        result = self.run_release(
            EVENT_NAME="workflow_dispatch",
            TAG="v1.2.3",
            RELEASE_TAGS_MOCK="v2.0.0",
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("<release> <create> <v1.2.3>", result.stderr)
        self.assertIn("<--latest=false>", result.stderr)
        self.assertNotIn("<--latest>", result.stderr)
        self.assertNotIn("<--prerelease>", result.stderr)
        self.assertIn("<--verify-tag>", result.stderr)

    def test_manual_prerelease_remains_prerelease(self):
        result = self.run_release(
            EVENT_NAME="workflow_dispatch", TAG="v1.2.3-beta",
            RELEASE_TAGS_MOCK="v2.0.0",
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("<--prerelease>", result.stderr)
        self.assertNotIn("<--latest>", result.stderr)

    def test_lookup_errors_never_create_or_report_success(self):
        # Nonzero statuses model auth/network/API failures, including a failure
        # on a later page after an earlier page has already returned a match.
        for status in ["1", "2", "4"]:
            for tags in ["", "v1.2.3"]:
                with self.subTest(status=status, tags=tags):
                    result = self.run_release(API_STATUS=status, RELEASE_TAGS_MOCK=tags)
                    self.assertEqual(result.returncode, int(status), result.stderr)
                    self.assertIn("<api>", result.stderr)
                    self.assertNotIn("<release> <create>", result.stderr)
                    self.assertNotIn("Release already exists", result.stdout)

    def test_invalid_or_missing_tags_never_call_github(self):
        for overrides in [
            {"TAG": "main"},
            {"TAG": ""},
            {"TAG": "v../bad"},
            {"TAG": "vbad tag"},
            {"TAG": "vbad\ntag"},
            {"TAG_STATUS": "1"},
        ]:
            with self.subTest(overrides=overrides):
                result = self.run_release(**overrides)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("::error::", result.stdout)
                self.assertNotIn("GH_CALL", result.stderr)

    def test_create_failure_is_not_swallowed(self):
        result = self.run_release(CREATE_STATUS="1")
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(result.stderr.count("<release> <create>"), 1)

    def test_shell_syntax(self):
        result = subprocess.run(
            [BASH, "-n"], input=RUN_BLOCK, text=True,
            capture_output=True, timeout=10, check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
