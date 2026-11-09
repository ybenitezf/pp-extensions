# orchestrator-mode Specification

## Purpose

Provides a conversation mode for read-only orchestration. It lets a person delegate implementation work while the orchestrator itself does not change files.

## Requirements

### Requirement: Conversation-scoped mode state
The system MUST let a person turn orchestrator mode on and off for the current conversation. The state MUST survive reloads and MUST record whether it is on, who changed it, and when.

#### Scenario: Turn mode on
- **WHEN** a person turns orchestrator mode on
- **THEN** the current conversation records the on state, actor, and time

#### Scenario: Turn mode off
- **WHEN** a person turns orchestrator mode off
- **THEN** the current conversation records the off state, actor, and time

#### Scenario: Reload an enabled conversation
- **WHEN** an enabled conversation reloads
- **THEN** orchestrator mode remains on

### Requirement: Orchestrator mode prompt
The system MUST include the orchestrator-mode prompt section only while the mode is on. The section MUST direct the orchestrator to read and delegate, and never change files itself.

#### Scenario: Prompt section is enabled
- **WHEN** the conversation has orchestrator mode on
- **THEN** its prompt includes the orchestrator-mode section

#### Scenario: Prompt section is disabled
- **WHEN** the conversation has orchestrator mode off
- **THEN** its prompt does not include the orchestrator-mode section

### Requirement: Simplified Technical English for delegated communication
While orchestrator mode is on, the `orchestrator_mode` prompt section MUST tell the orchestrator to write each brief to a subagent in ASD-STE100 and ask for the report in the same style. The section MUST NOT restate Pi Pocket's own Simplified Technical English rules or replace the core `subagents` or `guidelines` sections. Simplified Technical English applies only to text between agents. The orchestrator MUST answer the person in normal English and reduce the reports into that answer.

#### Scenario: Brief and report use Simplified Technical English
- **WHEN** the orchestrator delegates work while mode is on
- **THEN** it writes the brief in Simplified Technical English and asks for the report in Simplified Technical English

#### Scenario: Person receives a normal English summary
- **WHEN** the orchestrator reads a Simplified Technical English report and answers the person
- **THEN** it gives a normal English answer that reduces the report

### Requirement: Allowlisted tools while mode is on
While orchestrator mode is on, the system MUST allow only `read`, `subagent`, `ask`, `tool_search`, `codemode`, `artifact`, `sessions`, `session_read`, `design_preview`, `secrets_list`, `schedule`, `watch_pr`, `background` when its action is not `start`, and `memory`, plus non-built-in tools with `annotations.readOnlyHint === true`. It MUST block other tools. The gate follows the TARGET of a tool call: tools that act only on the current conversation may proceed, and tools that act on another session or on PiP stay blocked. This gate applies at tool-call time and does not change the model's advertised tool list. The separate `memory` extension still holds each memory write for the owner's approval.

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
- **WHEN** the orchestrator calls `schedule` or `watch_pr` in the current conversation while the mode is on
- **THEN** the call proceeds

#### Scenario: A scheduling or watcher tool targets another session or PiP
- **WHEN** the orchestrator calls `session_schedule`, `session_watch_pr`, or `repo_watch`
- **THEN** the call is blocked

#### Scenario: State-changing tools are called
- **WHEN** the orchestrator calls `approvals`, `ask_someone`, `secret_request`, `secret_save`, `design_export`, or `design_system`
- **THEN** the call is blocked

#### Scenario: The reserved legacy tool name is called
- **WHEN** the orchestrator calls `artifact_inline`
- **THEN** the call is blocked by the gate

### Requirement: Unchanged subagent arguments
While orchestrator mode is on, the system MUST NOT change the `model`, `tools`, `thinking`, or `followUp` arguments of a `subagent` call. The orchestrator chooses these arguments, and the built-in tool validates `model` against the owner's allowlist.

#### Scenario: The orchestrator supplies a model
- **WHEN** the orchestrator calls `subagent` with a `model` while mode is on
- **THEN** the module passes the call through unchanged

#### Scenario: The orchestrator supplies no model
- **WHEN** the orchestrator calls `subagent` without a `model` while mode is on
- **THEN** the module leaves `model` absent

### Requirement: Delegated child tool grant
While orchestrator mode is on, the system MUST allow the orchestrator to grant a child a tool set wider than the orchestrator's allowlist.

#### Scenario: A child receives a wider tool grant
- **WHEN** the orchestrator supplies a tool grant wider than its allowlist to a `subagent` call
- **THEN** the built-in tool gives the child the supplied tool set

### Requirement: Person-controlled mode entries
The system MUST provide one composer chip and one `/orchestrator-mode` command to turn the mode on or off for a session that can hold it. The chip MUST be present only while the open room is such a session.

#### Scenario: Person toggles from the composer
- **WHEN** the person activates the orchestrator-mode composer chip in a session
- **THEN** the mode toggles for that session

#### Scenario: Mode state is visible and can be turned off
- **WHEN** orchestrator mode is on or off in a session
- **THEN** the composer chip keeps one icon in both states, shows whether the mode is on without hover using the built-in Plan chip's border and tint for the on-state, and lets the person turn the mode off from the chip

#### Scenario: Chip is absent in a subagent transcript
- **WHEN** a subagent transcript is open
- **THEN** no orchestrator-mode composer chip is shown

#### Scenario: Chip returns with the main session state
- **WHEN** the person returns from a subagent transcript to the main session
- **THEN** the composer chip is shown with the main session's orchestrator-mode state

#### Scenario: Command refuses a non-session room
- **WHEN** the person runs `/orchestrator-mode` while the open room is not a session
- **THEN** the mode state does not change and the person is told that orchestrator mode applies to the main session

#### Scenario: Person toggles with the command
- **WHEN** the person runs `/orchestrator-mode` in a session
- **THEN** the mode toggles for that session


### Requirement: Blocked tools are absent from the deferred offer

While orchestrator mode is on, the deferred tools offer MUST NOT list a tool that the gate blocks. It MUST keep a tool whose call the gate allows, and it MUST keep background, because only the start action of background is blocked.

#### Scenario: Blocked deferred tools are absent

- **WHEN** orchestrator mode is on and the deferred tools offer would list browser, design_export, design_system, or ask_someone
- **THEN** the offer does not list that tool

#### Scenario: Allowed deferred tools remain

- **WHEN** orchestrator mode is on
- **THEN** the deferred tools offer keeps background, design_preview, schedule, watch_pr, and subagent

#### Scenario: No deferred tool remains

- **WHEN** orchestrator mode is on and the gate blocks every tool of the deferred offer
- **THEN** the offer lists no tool, and the section keeps only its header line

### Requirement: Blocked tools are absent from the script offer

While orchestrator mode is on, the codemode tools offer MUST NOT show a tool that the gate blocks. It MUST keep the tools that the gate allows, and it MUST keep the tools whose call the gate permits in that setting.

#### Scenario: State-changing built-in tools are absent

- **WHEN** orchestrator mode is on and the codemode offer would show bash, write, edit, secret_request, or secret_save
- **THEN** the offer does not show that tool

#### Scenario: Allowed script tools remain

- **WHEN** orchestrator mode is on
- **THEN** the codemode offer keeps the tools that the gate allows from a script

### Requirement: Both offers are unchanged while the mode is off

While orchestrator mode is off, the system MUST leave the text of the deferred tools offer and of the codemode offer as the source sections render it.

#### Scenario: The mode is off

- **WHEN** orchestrator mode is off
- **THEN** both offers read as they do without this behavior

### Requirement: The block message names the mode rule

While orchestrator mode is on, a blocked call MUST be answered with a message that names the tool, states that the mode offers read-only tools only, and states that a subagent can receive the tool in its tools grant. The message MUST NOT give the delegation instruction alone.

#### Scenario: A state-changing tool is blocked

- **WHEN** the orchestrator calls write, edit, bash, design_export, design_system, ask_someone, or a secret tool while the mode is on
- **THEN** the call is blocked with a message that names the tool, the mode rule, and the tools grant of a subagent

#### Scenario: A background start is blocked

- **WHEN** the orchestrator calls background with action start while the mode is on
- **THEN** the call is blocked with the same kind of message

#### Scenario: A blocked call from a script

- **WHEN** a codemode script calls a blocked tool while the mode is on
- **THEN** the script receives an error that holds the same message

#### Scenario: An allowed tool is not blocked

- **WHEN** the orchestrator calls an allowlisted tool while the mode is on
- **THEN** the call proceeds and no message is produced

#### Scenario: A read-only tool that is not built in

- **WHEN** the orchestrator calls a tool that is not built in and that declares the read-only annotation while the mode is on
- **THEN** the call proceeds

### Requirement: The prompt states the mode rule

While orchestrator mode is on, the orchestrator prompt section MUST state that the mode offers read-only tools only and that a step which needs another tool goes into the tools grant of a subagent. The section MUST NOT list the blocked tool names.

#### Scenario: The rule is in the prompt

- **WHEN** orchestrator mode is on
- **THEN** the prompt states the rule and the destination of a step that needs another tool
