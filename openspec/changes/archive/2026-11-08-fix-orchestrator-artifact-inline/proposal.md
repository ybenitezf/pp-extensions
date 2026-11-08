# Proposal

## Why

pi-pocket 0.28.0 removed the `artifact_inline` tool: inline cards are now an `artifact` call with `inline: true`. The orchestrator-mode gate still allows the dead name `artifact_inline`, and the orchestrator-mode spec still documents it as allowed.

## What Changes

- Remove `artifact_inline` from the allowlist (`ALLOWED_TOOLS`) in `extensions/orchestrator-mode/orchestrator-mode.ts`, so the gate no longer permits a reserved name that can never run. `artifact` with `inline: true` is already allowed.
- Keep `artifact_inline` in `BUILT_IN_TOOL_NAMES` with a comment: the host still lists that name as reserved, and the set must stay aligned with the host's `BUILT_IN_TOOLS` (see issue #17).
- Update the allowlist requirement of the `orchestrator-mode` spec through a delta in this change. The main spec under `openspec/specs/` changes only with the OpenSpec sync flow, never by hand.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `orchestrator-mode`: the allowlist requirement drops `artifact_inline`, adds a scenario for `artifact` with `inline: true`, and adds a scenario that blocks the reserved name `artifact_inline`.

## Impact

- Code: `extensions/orchestrator-mode/orchestrator-mode.ts` (`ALLOWED_TOOLS` only).
- Spec: `openspec/specs/orchestrator-mode/spec.md`, updated later by the sync flow.
- Drop-in: the module copy in Pi Pocket's drop-in folder must be replaced, then Pi Pocket reloaded.
- Behavior: a call to `artifact_inline` changes from "allowed, then host reports not available" to "blocked by the gate". No other tool behavior changes.
- GitHub issue #14 tracks this work.
