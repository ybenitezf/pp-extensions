# Tasks

## 1. Update verifier instructions

- [x] 1.1 Edit `extensions/orchestrator-mode/orchestrator-mode.ts` in the `ORCHESTRATOR_PROMPT` constant. Replace the existing verifier sentence with instructions that preserve the current trigger: spawn exactly one independent verifier only when a child claims a test or command result that the orchestrator cannot repeat; do not spawn one when the orchestrator can repeat the result; and never verify a verifier. Verify the edited prompt contains each of these rules verbatim or with equivalent precise meaning.
- [x] 1.2 In the same `ORCHESTRATOR_PROMPT` edit in `extensions/orchestrator-mode/orchestrator-mode.ts`, require the verifier model to differ from the child model; when the owner's allowlist has more than one model and a different provider is available, prefer that provider; and when only one model is allowed, still run the verifier on it and disclose the weaker check in the dispatch line, such as `verifier on <model> (only allowed model)`. Verify the prompt states all three selection and disclosure cases.
- [x] 1.3 In the same `ORCHESTRATOR_PROMPT` edit in `extensions/orchestrator-mode/orchestrator-mode.ts`, require a clean-room verifier brief that includes the task and how to check it but does not state or imply the child's claimed result. Verify the prompt gives both required brief contents and the prohibition on the child's outcome.

## 2. Check the specification scenarios

- [x] 2.1 Review `openspec/changes/verifier-different-model/specs/orchestrator-mode/spec.md` against the final `ORCHESTRATOR_PROMPT` in `extensions/orchestrator-mode/orchestrator-mode.ts`. Verify every scenario is covered: different model, different provider preference, single-model fallback disclosure, clean-room brief, unrepeatable-result trigger, repeatable-result no-verifier behavior, and no verification of a verifier. Record and correct any missing rule in the prompt before continuing.

## 3. Repository verification and delivery

- [x] 3.1 Run `scripts/check.sh` for the edited module `extensions/orchestrator-mode/orchestrator-mode.ts`; verify it prints exit code 0. Do not treat an unrun or failing check as complete.
- [x] 3.2 Use the `extension-dropin` skill at `.agents/skills/extension-dropin/SKILL.md` to copy `extensions/orchestrator-mode/orchestrator-mode.ts` into Pi Pocket's drop-in folder. Use a copy, never a symbolic link, and do not commit the drop-in copy. After every edit to `extensions/orchestrator-mode/orchestrator-mode.ts`, make a new copy through that skill so Pi Pocket can load the edit; verify the copied module reaches the drop-in folder only through this procedure.
- [x] 3.3 Finish this change as one change of one module in one commit. Verify the commit contains only the intended `extensions/orchestrator-mode/orchestrator-mode.ts` change and uses a message in the form `feat: <what>` or `fix: <what>`; do not commit the drop-in copy or `node_modules`.
- [x] 3.4 If the change is pushed, push only the current branch with `git push origin HEAD`; verify no other branch is named and no force-push option is used.
