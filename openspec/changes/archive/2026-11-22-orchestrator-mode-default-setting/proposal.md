# Proposal

## Why

Orchestrator mode is always on for conversations with no stored state. Owners need a setting to choose the default without changing explicit per-conversation choices. The setting must preserve the current behavior until the owner changes it. A change of the setting must not change a conversation that already started, so a conversation takes the setting once and keeps that value.

## What Changes

- Add one owner boolean setting, `default_on`, to the orchestrator-mode extension. Its default is `true`.
- Capture the current `default_on` value in a conversation at its first mode resolution that can write, which is its first chip read or its first toggle. The read-only paths, the prompt and the tool gate, resolve the current setting only while the conversation stores no record. The conversation keeps that captured value until someone toggles the mode.
- Apply a change of the setting only to conversations that never resolved the mode.
- Make the toggle flip the captured value, so the first toggle writes `on` when the captured default is off.
- Keep the composer chip and its browser part unchanged; they continue to use the existing GET route.
- Capture the setting in a fork with no stored state at the fork's first use, because a fork has no document of its own.
- Fall back to the current on-by-default behavior when the experimental settings API is absent.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `orchestrator-mode`: A conversation captures the owner setting at its first mode resolution and keeps that value until a toggle. The first toggle and the fork behavior follow the captured value.

## Impact

- Affected module: `extensions/orchestrator-mode/orchestrator-mode.ts`.
- Affected contract: `openspec/specs/orchestrator-mode/spec.md`.
- Uses the Pi Pocket extension settings API when available, with compatibility fallback when it is absent.
- No change to the composer chip or browser client behavior.
- A first mode resolution writes one stored record per conversation.
