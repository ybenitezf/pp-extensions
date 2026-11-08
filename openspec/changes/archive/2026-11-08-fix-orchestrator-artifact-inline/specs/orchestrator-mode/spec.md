# Spec Delta

## MODIFIED Requirements

### Requirement: Allowlisted tools while mode is on
While orchestrator mode is on, the system MUST allow only `read`, `subagent`, `ask`, `tool_search`, `codemode`, `artifact`, `sessions`, `session_read`, `design_preview`, `secrets_list`, `background` when its action is not `start`, and `memory`, plus non-built-in tools with `annotations.readOnlyHint === true`. It MUST block other tools. This gate applies at tool-call time and does not change the model's advertised tool list. The separate `memory` extension still holds each memory write for the owner's approval.

#### Scenario: An allowlisted tool is called
- **WHEN** the orchestrator calls an allowlisted tool
- **THEN** the call proceeds

#### Scenario: A read-only non-built-in tool is called
- **WHEN** the orchestrator calls a non-built-in tool with `annotations.readOnlyHint === true`
- **THEN** the call proceeds

#### Scenario: The memory tool is called
- **WHEN** the orchestrator calls `memory` while the mode is on
- **THEN** the call proceeds and the separate `memory` extension applies its own approval flow to the write

#### Scenario: An inline artifact card is requested
- **WHEN** the orchestrator calls `artifact` with `inline: true`
- **THEN** the call proceeds

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
- **WHEN** the orchestrator calls `schedule`, `watch_pr`, `repo_watch`, or `session_watch_pr`
- **THEN** the call is blocked

#### Scenario: State-changing tools are called
- **WHEN** the orchestrator calls `approvals`, `ask_someone`, `secret_request`, `secret_save`, `design_export`, or `design_system`
- **THEN** the call is blocked

#### Scenario: The reserved legacy tool name is called
- **WHEN** the orchestrator calls `artifact_inline`
- **THEN** the call is blocked by the gate
