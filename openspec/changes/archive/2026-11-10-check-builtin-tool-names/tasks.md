# Tasks

## 1. Add the host comparison step to `scripts/check.sh`

- [x] 1.1 Find the host file from the types symlink: run `readlink -f` on `$drop_in/_pocket.d.ts`, run `dirname` twice, then append `/src/server/reload.ts`. Verify the path prints `/app/src/server/reload.ts` here.
- [x] 1.2 Extract the host names: read the block after the anchor `BUILT_IN_TOOLS: ReadonlySet<string> = new Set([` up to the closing `]);`, and keep the quoted names. Verify the extraction prints 31 names.
- [x] 1.3 Extract the module names from each `extensions/*/*.ts` file that holds the anchor `BUILT_IN_TOOL_NAMES = new Set([`. Verify the extraction of `extensions/orchestrator-mode/orchestrator-mode.ts` prints 31 names.
- [x] 1.4 Compare the 2 sets with exact equality in both directions, print both counts, and print each name that is missing on each side. Verify the message names the counts.
- [x] 1.5 Hold rule 1: a run that extracts 0 names from either side prints a failure and does not pass. Verify with a temporary copy of the script, outside the repository, that points at a file with no names.
- [x] 1.6 Hold rule 2: a host file that exists but holds no anchor prints a failure that names the anchor. Verify with a temporary copy of the script that points at a file with no anchor.
- [x] 1.7 Hold rule 4: when the host file is absent, the step prints a skip line and does not fail the run. Verify with a temporary copy of the script that points at a missing path, and read the printed line.

## 2. Wire the step into the script

- [x] 2.1 Put the comparison step before the module type-check loop, so that a failed inventory exits the script with a non-zero code at once, before any type-check runs.
- [x] 2.2 Make the comparison fail fast: a failed comparison exits with a non-zero code at once, and no module type-check runs. The existing overall exit code of the type-check loop does not change for type-check failures. Verify with `bash -n scripts/check.sh` and a read of the exit paths.
- [x] 2.3 Prove the fail-fast rule: make a temporary copy of the script, outside the repository, whose comparison fails. Verify that the run prints no per-module type-check line, and delete the temporary copy after the run.
- [x] 2.4 Update the header comment of `scripts/check.sh` so that it names both jobs: the type-check of each module, and the comparison of each copied built-in inventory. Verify by reading the first 15 lines.

## 3. Verify the change here

- [x] 3.1 Run `scripts/check.sh` and verify exit code 0, the 2 counts of 31 names, and the existing per-module type-check lines.
- [x] 3.2 Remove 1 name from the copy in a temporary copy of the module, in a scratch folder outside `extensions/`, and verify the check reports the difference. Delete the scratch folder after the check.
- [x] 3.3 Run `scripts/check.sh` again and verify exit code 0, and verify that `git diff --stat` names only `scripts/check.sh`.
- [x] 3.4 Read `extensions/orchestrator-mode/orchestrator-mode.ts` and verify that `BUILT_IN_TOOL_NAMES`, `modeGate`, and its check order are unchanged. Verify that `git status --short` names no file in `extensions/` and no file in `/app`.
- [x] 3.5 Verify that no module copy in the drop-in folder changed, because this change edits no module and needs no reinstall.

## Workflow follow-up

- Commit as `chore: check the built-in tool names against the host`, after `scripts/check.sh` prints exit code 0.
- Archive the change after review, and verify that `openspec/specs/orchestrator-mode/spec.md` then holds the new requirement with its 3 scenarios.
