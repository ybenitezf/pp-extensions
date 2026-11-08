# Spec Delta

## MODIFIED Requirements

### Requirement: Allowlisted tools while mode is on
While orchestrator mode is on, the system MUST allow `read`, `subagent`, `ask`, `tool_search`, `codemode`, `artifact`, `artifact_inline`, `sessions`, `session_read`, `design_preview`, `secrets_list`, `schedule`, `watch_pr`, `background` when its action is not `start`, and `memory`, plus non-built-in tools with `annotations.readOnlyHint === true`. It MUST block other tools. The gate follows the TARGET of a tool call: tools that act only on the current conversation may proceed, and tools that act on another session or on PiP stay blocked. This gate applies at tool-call time and does not change the model's advertised tool list. The separate `memory` extension still holds each memory write for the owner's approval.

#### Scenario: An allowlisted tool is called
- **WHEN** the orchestrator calls an allowlisted tool
- **THEN** the call proceeds

#### Scenario: A read-only non-built-in tool is called
- **WHEN** the orchestrator calls a non-built-in tool with `annotations.readOnlyHint === true`
- **THEN** the call proceeds

#### Scenario: The memory tool is called
- **WHEN** the orchestrator calls `memory` while the mode is on
- **THEN** the call proceeds and the separate `memory` extension applies its own approval flow to the write

#### Scenario: File changes and shell commands are attempted
- **WHEN** the orchestrator calls `write`, `edit`, or `bash`
- **THEN** the call is blocked

#### Scenario: A command-starting background action is attempted
- **WHEN** the orchestrator calls `background` with action `start`
- **THEN** the call is blocked

#### Scenario: Other sessions are changed
- **WHEN** the orchestrator calls `session_start`, `session_send`, `session_follow`, `session_stop`, `session_archive`, `session_schedule`, or `team`
- **THEN** the call is blocked

#### Scenario: Scheduling or watcher tools are called
- **WHEN** the orchestrator calls `schedule` or `watch_pr` in the current conversation while the mode is on
- **THEN** the call proceeds

#### Scenario: A scheduling or watcher tool targets another session or PiP
- **WHEN** the orchestrator calls `session_schedule`, `session_watch_pr`, or `repo_watch`
- **THEN** the call is blocked

#### Scenario: State-changing tools are called
- **WHEN** the orchestrator calls `approvals`, `ask_someone`, `secret_request`, `secret_save`, `design_export`, or `design_system`
- **THEN** the call is blocked
