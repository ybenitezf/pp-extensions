# Tasks

## 1. Prompt behavior

- [x] 1.1 Update ORCHESTRATOR_PROMPT in extensions/orchestrator-mode/orchestrator-mode.ts to define a logical wave, require a terminal outcome for each work unit before proceeding, and reduce and verify results before the next wave. Require an evidence-based review of all pending nodes and dependencies after each wave; preserve completed work and requested scope; state unchanged when evidence has no material effect; and show a concise node/edge diff, reason, and next wave before dispatch without a concurrent-call count. Ask the person before any scope change. Verify the prompt against every scenario in the orchestrator-mode spec delta, then run scripts/check.sh and confirm exit code 0.

Acceptance: the task uses the required numbered checkbox format and states how to verify completion.
