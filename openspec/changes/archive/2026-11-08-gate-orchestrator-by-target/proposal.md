# Proposal

## Why

The orchestrator-mode gate blocks `schedule` and `watch_pr` even though they act only on the current conversation. They should follow the target rule the gate already applies to other tools.

## What Changes

- While orchestrator mode is on, the gate follows the TARGET of a tool call, not the tool name.
- Allow every action of `schedule` and every action of `watch_pr`.
- Keep blocked: `write`, `edit`, `bash`, `background` with action `start`, the session tools, `repo_watch`, `session_watch_pr`, `approvals`, `ask_someone`, `secret_request`, `secret_save`, `design_export`, and `design_system`.
- `background` stays the only argument-dependent exception: action `start` runs a shell command, so it stays blocked.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `orchestrator-mode`: update the "Allowlisted tools while mode is on" requirement. The existing scenario "Scheduling or watcher tools are called" now states the allowed case: `schedule` or `watch_pr` in the current conversation. A new scenario states the blocked case: `session_schedule`, `session_watch_pr`, and `repo_watch`.

## Impact

- `extensions/orchestrator-mode/orchestrator-mode.ts`
- `extensions/orchestrator-mode/README.md`
