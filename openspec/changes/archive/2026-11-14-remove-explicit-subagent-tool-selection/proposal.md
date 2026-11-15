# Proposal

## Why

The orchestrator prompt currently requires an explicit tool selection for every child. Remove that blanket instruction while keeping each brief clear about file-change permission and path limits.

## What Changes

- Remove the sentence requiring the orchestrator to set each child's tools explicitly.
- Keep the instructions about file-change permission, paths, and avoiding overlapping file ownership.
- Do not change the `subagent` tool contract or how tool arguments pass through.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `orchestrator-mode`: Update the prompt requirement so it no longer mandates explicit tool selection for every child, while retaining the remaining delegation and file-scope instructions.

## Impact

- `extensions/orchestrator-mode/orchestrator-mode.ts`: Update the opening paragraph of `ORCHESTRATOR_PROMPT`.
- No API, runtime routing, or tool-grant validation changes.
