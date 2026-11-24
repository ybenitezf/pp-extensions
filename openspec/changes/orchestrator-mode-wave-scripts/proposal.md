# Proposal

## Why

Rule 36 of the orchestrator prompt tells the orchestrator to send one wave in one batch, and rule 50 tells it to show the next wave before dispatch. Neither rule names a dispatch mechanism. Orchestrators therefore dispatch children in different ways, and a restart during dispatch can leave a partial wave. Codemode already sits on the allowlist, `tools.subagent` spawn works from inside a script, and each spawn keeps its guard check. This change needs a prompt-section edit only, with no gate change.

## What Changes

- State that a wave with 2 or more steps MUST be sent as 1 codemode script. The script spawns every child of that wave. A wave with 1 step stays a plain spawn call.
- State that the next-wave summary shows each step name, its effective model, its tools grant, and the codemode script that will launch the wave.
- Add a rule for an interrupted wave script: the orchestrator MUST check the status of every child named in the script before it retries the script, because a restart during a script can leave a partial wave.
- Keep the DAG and the wave order as prose in conversation context. A script cannot await terminal outcomes of its children, because spawn returns at once and the script ends. The orchestrator still waits for terminal outcomes after the wave, as today.
- Change only the prompt string `ORCHESTRATOR_PROMPT`. Tool gates, settings, state storage, and the subagent tool stay unchanged.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `orchestrator-mode`: The prompt rules for wave dispatch, the next-wave summary, and recovery after an interrupted wave script.

## Impact

- Code: `extensions/orchestrator-mode/orchestrator-mode.ts`, only the `ORCHESTRATOR_PROMPT` string constant. No other module, no tool gate, and no API change.
- Spec: `openspec/specs/orchestrator-mode/spec.md` behavior for prompt-directed wave dispatch; design decides whether this becomes a new requirement or added scenarios.
- Verification: `scripts/check.sh` must print exit code 0. The edited copy reaches Pi Pocket through the drop-in procedure in `.agents/skills/extension-dropin/SKILL.md`. One change in one commit, with a `feat:` or `fix:` message.
