# Tasks

## 1. Prompt text

- [x] 1.1 Add the omission sentence to `ORCHESTRATOR_PROMPT` in `extensions/orchestrator-mode/orchestrator-mode.ts` and verify with `grep -n "leave it omitted" extensions/orchestrator-mode/orchestrator-mode.ts` that the sentence sits in the first paragraph next to "Never change files yourself"
- [x] 1.2 Run `scripts/check.sh` and verify it prints exit code 0 (re-run confirmed: 5 modules checked, exit code 0)
- [x] 1.3 Refresh the drop-in copy at `$PI_POCKET_DIR/extensions/orchestrator-mode.ts` and verify with `cmp extensions/orchestrator-mode/orchestrator-mode.ts $PI_POCKET_DIR/extensions/orchestrator-mode.ts` that the two files are byte-equal (cmp returned no difference)

## 2. Spec record

- [x] 2.1 Update the "Orchestrator mode prompt" requirement in `openspec/specs/orchestrator-mode/spec.md` and verify with `git diff -- openspec/specs/orchestrator-mode/spec.md` that the requirement says the section MUST direct the orchestrator to omit the `tools` argument from every `subagent` call
- [x] 2.2 Replace the old prompt scenario and verify with the same diff that the scenario is named "Subagent calls omit the tools argument" with a THEN step that omits the `tools` argument
- [x] 2.3 Verify with `git diff --stat -- openspec/specs/orchestrator-mode/spec.md` that no requirement other than "Orchestrator mode prompt" changed, so the model-selection rules and the file-change brief rules are untouched
- [x] 2.4 Create the delta at `openspec/changes/omit-subagent-tools-argument/specs/orchestrator-mode/spec.md` and verify the file holds the full updated requirement block under `## MODIFIED Requirements`

## 3. Integration checks

- [x] 3.1 Verify the prompt still states file-change permission and allowed paths in each brief: `grep -n "State in every brief whether it may change files" extensions/orchestrator-mode/orchestrator-mode.ts` finds the sentence
- [x] 3.2 Run `openspec validate omit-subagent-tools-argument` and verify it reports the change is valid (output: `Change 'omit-subagent-tools-argument' is valid`, exit code 0)

## 4. Commit

- [x] 4.1 Commit the prompt edit, the main spec edit, and this change's artifacts, and verify with `git status --short` that the working tree is clean and with `git log -1 --format=%s` that the message follows `fix: <what>`

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied. Do not archive it as part of this planning run.
- Verify the archived result.
