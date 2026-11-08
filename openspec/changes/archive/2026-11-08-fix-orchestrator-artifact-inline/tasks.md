# Tasks

## 1. Module fix

- [x] 1.1 Remove `"artifact_inline",` from `ALLOWED_TOOLS` in `extensions/orchestrator-mode/orchestrator-mode.ts` and add a short comment on `BUILT_IN_TOOL_NAMES` saying the host keeps `artifact_inline` reserved since 0.28.0; verify with `grep -n artifact_inline extensions/orchestrator-mode/orchestrator-mode.ts` that only `BUILT_IN_TOOL_NAMES` holds the name.

## 2. Checks

- [x] 2.1 Run `scripts/check.sh` and verify the `orchestrator-mode.ts` line reports exit code 0 (the script overall exits 2 only from the pre-existing `_template` error).
- [x] 2.2 Grep the repository for `artifact_inline` and verify the remaining hits are only `BUILT_IN_TOOL_NAMES`, the archived change specs (left untouched), and the drop-in copy.

## 3. Drop-in and load

- [x] 3.1 Reinstall the module in Pi Pocket's drop-in folder with the `.agents/skills/extension-dropin/SKILL.md` skill and verify `diff` shows the repo file and the drop-in copy identical.
- [x] 3.2 Verify Pi Pocket lists `orchestrator-mode` as on in Menu -> Extensions after the reload (the owner restarts Pi Pocket if the module does not reload).

## 4. Commit

- [x] 4.1 Commit the module fix as `fix: drop artifact_inline from orchestrator-mode allowlist` and verify `git log --oneline -1` shows it.
- [x] 4.2 Commit the change artifacts as `chore: add fix-orchestrator-artifact-inline change` and verify `git status --short` shows no change files left.

## Workflow follow-up

- Sync the delta into `openspec/specs/orchestrator-mode/spec.md` with the OpenSpec sync flow after the review.
- Archive the change with the OpenSpec archive flow after the implementation is complete.
- Close GitHub issue #14 with a reference to the commit.
