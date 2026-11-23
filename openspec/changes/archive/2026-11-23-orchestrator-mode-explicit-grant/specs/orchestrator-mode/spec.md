# Spec Delta

## ADDED Requirements

### Requirement: Spawn without an explicit tools grant is blocked
While orchestrator mode is on, the gate MUST block a `subagent` call from a caller that is not a subagent conversation when its action is `spawn` and its `tools` argument is missing or an empty array. A spawn with a non-empty `tools` array MUST pass, and the gate MUST NOT judge which tools the grant names.

#### Scenario: Spawn omits the tools argument
- **WHEN** orchestrator mode is on and a caller that is not a subagent conversation calls `subagent` with action `spawn` and no `tools` argument
- **THEN** the gate blocks the call before it runs

#### Scenario: Spawn sets an empty tools array
- **WHEN** orchestrator mode is on and such a caller calls `subagent` with action `spawn` and `tools` set to an empty array
- **THEN** the gate blocks the call before it runs

#### Scenario: A non-empty grant passes
- **WHEN** orchestrator mode is on and such a caller calls `subagent` with action `spawn` and a non-empty `tools` array
- **THEN** the call proceeds, whichever tools the grant names

#### Scenario: The gate does not apply to a subagent caller
- **WHEN** a subagent conversation calls `subagent` with action `spawn` and no `tools` argument while orchestrator mode is on
- **THEN** the gate does not block the call, because a subagent conversation stays exempt from the gate

#### Scenario: The other actions stay untouched
- **WHEN** orchestrator mode is on and a caller that is not a subagent conversation calls `subagent` with action `send`, `stop`, or `status`, with or without a `tools` argument
- **THEN** the gate treats the call as it did before this change

### Requirement: The unnamed-grant block message teaches the fix
While orchestrator mode is on, the message that blocks a spawn without an explicit grant MUST state that a spawn without a named grant gives the child the default tool set, including `write`, `edit`, and `bash`, and MUST direct the caller to set `tools` to a non-empty list of exact tool names.

#### Scenario: The message names the danger
- **WHEN** the gate blocks a spawn whose `tools` argument is missing or an empty array
- **THEN** the message states that such a spawn gives the child the default tool set, including `write`, `edit`, and `bash`

#### Scenario: The message directs the fix
- **WHEN** the gate blocks a spawn whose `tools` argument is missing or an empty array
- **THEN** the message directs the caller to set `tools` to a non-empty list of exact tool names

## MODIFIED Requirements

### Requirement: Orchestrator mode prompt
The system MUST include the orchestrator-mode prompt section only while the mode is on. The section MUST direct the orchestrator to read and delegate, and never change files itself. It MUST direct the orchestrator to set an explicit, task-specific `tools` grant on every subagent spawn, including read-only tasks, and to include `codemode` in that grant. Each brief MUST state whether the child may change files and which paths it may touch. The section MUST preserve the host failure rule: retry a task-level failure at most once on the same model, but stop and report a model or provider failure.

#### Scenario: Prompt section is enabled
- **WHEN** the conversation has orchestrator mode on
- **THEN** its prompt includes the orchestrator-mode section

#### Scenario: Prompt section is disabled
- **WHEN** the conversation has orchestrator mode off
- **THEN** its prompt does not include the orchestrator-mode section

#### Scenario: Subagent calls omit the tools argument
- **WHEN** the orchestrator calls the subagent tool with `send`, `stop`, or `status`
- **THEN** it omits the `tools` argument because the argument applies only to `spawn`

#### Scenario: Every spawn has an explicit task grant
- **WHEN** the orchestrator spawns a child for any task, including a read-only task
- **THEN** it supplies an explicit grant containing only the tools needed for that task

#### Scenario: Every spawn grant includes codemode
- **WHEN** the orchestrator prepares the `tools` grant for a spawn
- **THEN** the prompt directs it to include `codemode` in that grant

#### Scenario: Brief keeps file-change limits
- **WHEN** the orchestrator prepares a brief for a child
- **THEN** the brief states whether the child may change files and which paths it may touch

#### Scenario: Task-level failure gets at most one corrected retry
- **WHEN** a child has a task-level failure that is not caused by its model or provider
- **THEN** the orchestrator may correct the brief and retry once on the same model

#### Scenario: Model or provider failure is reported
- **WHEN** a child fails because of its model or provider
- **THEN** the orchestrator stops and reports the failure without retrying the work on another model
