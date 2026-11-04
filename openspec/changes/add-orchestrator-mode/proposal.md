# Proposal

## Why

People need a conversation mode that coordinates work without changing files. A pure orchestrator can inspect context, delegate implementation to a child, and leave all file changes to that child.

## What Changes

- Add the `orchestrator-mode` drop-in extension with a conversation-scoped on/off state, conditional prompt section, `beforeTool` allowlist gate, composer chip, and `/orchestrator-mode` command; the section also guides delegated communication style.
- Model and tool choice stay with the orchestrator and are validated by the built-in `subagent` tool.
- Keep `bash` blocked while the mode is on; delegate shell work to a child.
- Verify host behavior and release blockers before writing module code.

## Capabilities

### New Capabilities
- `orchestrator-mode`: Conversation behavior for read-only orchestration and delegated work.

### Modified Capabilities

## Impact

- Add `extensions/orchestrator-mode/orchestrator-mode.ts` as a single drop-in module; reuse the built-in `subagent` tool.
- No new tool, dependency, or `pocketApi = 2` export. Install only through the extension drop-in skill.
