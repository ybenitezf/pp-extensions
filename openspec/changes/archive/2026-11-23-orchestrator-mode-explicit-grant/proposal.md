# Proposal

## Why

Orchestrator mode restricts the main session to read-only tools, but nothing enforces the tools grant on a subagent spawn: a spawn with `tools` omitted gives the child the parent's full tool set, and a spawn with `tools: []` gives the child the host default set, which includes `write`, `edit`, and `bash`. Live tests in the owner's session confirmed both behaviors, so a forgetful or imprecise spawn silently hands a child write access while the mode's promise is read-only orchestration.

## What Changes

- Add a gate to the module's `modeGate` hook: while orchestrator mode is on and the caller is not a subagent conversation, a `subagent` call whose action is `spawn` and whose `tools` argument is missing or an empty array is blocked with a message that names the danger and tells the caller to set `tools` to a non-empty list of exact tool names.
- Leave the actions `send`, `stop`, and `status` untouched, and let any non-empty grant pass unchanged; the membership of a non-empty grant stays the caller's judgment.
- Add one sentence to `ORCHESTRATOR_PROMPT` that tells the caller to always include `codemode` in the tools grant of every spawn (prompt encouragement, not a gate).
- Keep out of scope: `tool_search` gating, any change to the installed pi-pocket package, any change to how the host resolves a missing or empty `tools` argument, and the host default tool set.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `orchestrator-mode`: the mode's spawn gate and prompt section change. A spawn without an explicit, non-empty `tools` grant is now blocked while the mode is on, and the prompt section additionally directs the orchestrator to include `codemode` in every spawn's grant.

## Impact

- `extensions/orchestrator-mode/orchestrator-mode.ts`: the `modeGate` `beforeTool` hook gains one branch for the spawn gate, and `ORCHESTRATOR_PROMPT` gains one sentence. No other file of the module changes.
- The host hook API can only block a call, not rewrite its arguments, so the gate blocks; the existing requirement that the module must not change subagent call arguments stays intact.
- Subagent conversations keep their exemption from the hook and the prompt section, and behavior while the mode is off does not change.
- Verification runs `scripts/check.sh` (exit code 0), copies the module into the Pi Pocket drop-in folder per `.agents/skills/extension-dropin/SKILL.md`, and spawns one child without `tools` and one with a non-empty grant while the mode is on.
