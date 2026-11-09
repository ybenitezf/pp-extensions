# Spec Delta

## ADDED Requirements

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
