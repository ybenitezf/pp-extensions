# Proposal

## Why

While orchestrator mode is on, the mode blocks every state-changing tool, including `memory`. An orchestrator in this mode cannot record a durable note for the person, so it must keep that fact in the conversation only. Conversations do not survive as memory across sessions, so a delegated plan can lose a decision the person asked the orchestrator to remember. The separate `memory` extension already holds each memory write for the owner's approval, so allowing `memory` does not weaken that approval gate.

## What Changes

- Allow the `memory` tool while orchestrator mode is on, by adding `memory` to the mode's allowed tools.
- Stop blocking `memory` by name while orchestrator mode is on: remove `memory` from the explicitly blocked tool list, while every other state-changing tool there stays blocked.
- Keep `memory` in the built-in tool name set, so a block again covers it if the allowed-tools check ever stops matching first.
- Add a spec scenario that covers a `memory` call while the mode is on: the call proceeds.
- Update the "State-changing tools are called" spec scenario so it no longer lists `memory`; the remaining blocked tools stay unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `orchestrator-mode`: The "Allowlisted tools while mode is on" requirement changes. `memory` moves from the blocked tool list to the allowed tool list, and the scenario for state-changing tool calls drops `memory`. A new scenario covers a `memory` call that proceeds while the mode is on. Approval behavior of the separate `memory` extension is out of scope for this capability and unchanged.

## Impact

- `extensions/orchestrator-mode/orchestrator-mode.ts`: add `memory` to `ALLOWED_TOOLS`, remove it from `EXPLICITLY_BLOCKED_TOOLS`, keep it in `BUILT_IN_TOOL_NAMES`. The `beforeTool` hook order (explicitly blocked → allowed → built-in) keeps the pair consistent after the edit.
- Spec: `openspec/specs/orchestrator-mode/spec.md` changes only after apply and archive.
- No change to the `memory` extension, its approval flow, or Pi Pocket core.
