# Tasks

## 1. Prepare

- [x] 1.1 Confirm the only file to edit is `extensions/orchestrator-mode/orchestrator-mode.ts` and that `ORCHESTRATOR_PROMPT` is present.
- [x] 1.2 Read the spec scenarios in `openspec/changes/cost-aware-subagent-routing/specs/orchestrator-mode/spec.md` and note the policy rules to encode in the prompt.

## 2. Update the orchestrator prompt

- [x] 2.1 Add a cost-aware model-routing paragraph to `ORCHESTRATOR_PROMPT` in `extensions/orchestrator-mode/orchestrator-mode.ts` that tells the orchestrator to prefer the lowest-cost owner-allowed model capable of each delegated task; verify the new text is inside the existing backtick template and preserves all surrounding text.
- [x] 2.2 Ensure the added prompt text requires a task-specific capability reason to choose a higher-cost model and forbids generic justifications such as "better quality".
- [x] 2.3 Ensure the added prompt text treats a missing price as unknown, not cheap, and permits such a model only when its capabilities justify the uncertainty.
- [x] 2.4 Ensure the added prompt text limits selection to owner-allowed models and forbids inventing unallowed alternatives.
- [x] 2.5 Ensure the added prompt text directs the visible DAG/wave plan to list the effective `provider/modelId` for each subagent spawn before dispatch.
- [x] 2.6 Ensure the added prompt text directs the plan to identify the effective current-session model for a spawn that omits `model`.
- [x] 2.7 Ensure the added prompt text directs the plan to include one brief task-specific capability reason for every higher-cost or unknown-price choice, while an ordinary lowest-cost known-price capable choice needs no reason.
- [x] 2.8 Confirm the `subagent` tool call sites and argument pass-through remain unchanged and no other code, UI, or tool contract is modified.

## 3. Verify

- [x] 3.1 Run `scripts/check.sh` and confirm it exits with code 0 (type-checks the module and compares built-in tool names).
- [x] 3.2 Review the updated prompt against all original cost-selection scenarios: cheaper allowed model for a simple task, higher-cost model for a task-specific capability, unknown price not treated as cheap, and no selection outside the allowlist.
- [x] 3.3 Review the updated prompt against all new model-reporting scenarios: explicit `provider/modelId` named in the DAG/wave plan before dispatch, inherited session model identified for a spawn that omits `model`, and a brief task-specific capability reason present for each higher-cost or unknown-price choice.

## 4. Copy to Pi Pocket drop-in folder

- [x] 4.1 Copy `extensions/orchestrator-mode/orchestrator-mode.ts` into Pi Pocket's drop-in `extensions/` folder by following `.agents/skills/extension-dropin/SKILL.md` (install playbook). Do not perform the copy now; the implementer does it. Steps: set `dropin="${PI_POCKET_DIR:-$HOME/.pi-pocket}/extensions"`; run `test -d "$dropin"` before any write and stop if it exits not 0 (do not make the folder); run the ownership test `cmp -s extensions/orchestrator-mode/orchestrator-mode.ts "$dropin/orchestrator-mode.ts"` and stop if the target exists with different bytes — write nothing and report the conflict; otherwise copy the module with `cp extensions/orchestrator-mode/orchestrator-mode.ts "$dropin/orchestrator-mode.ts"`; then confirm the ownership test exits 0 (byte equality) and that the target is a regular file, not a symbolic link.

## Workflow follow-up

- Archive the change after the project's review requirements are satisfied.
