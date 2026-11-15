# Proposal

## Why

The orchestrator-mode prompt currently tells the orchestrator to omit `tools` from every subagent call, but the built-in tool defaults an omitted grant to the caller's tools. This prevents deliberate task-scoped grants and can leave children without the tools their work needs. The prompt also says to retry after any failure, while Pi Pocket's subagent guidance requires stopping on model or provider failures.

## What Changes

- Require an explicit, minimal `tools` grant on every subagent spawn, including read-only tasks.
- Require a new child when later work needs a different tool grant; `send` cannot change a child's grant.
- Preserve one corrected retry for task-level failures. Stop and report model or provider failures, and do not retry them on another model.
- Keep grants within the tools available to the parent. Do not change the host tool schema, the orchestrator-mode call gate, or the session's advertised tools.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `orchestrator-mode`: Change the prompt requirements for subagent tool grants and failure handling.

## Impact

- `extensions/orchestrator-mode/orchestrator-mode.ts`: Update the orchestrator prompt.
- `openspec/specs/orchestrator-mode/spec.md`: Update the prompt and delegated-child-grant requirements.
- No changes to Pi Pocket's built-in subagent tool, tool inventory, or runtime gate.
