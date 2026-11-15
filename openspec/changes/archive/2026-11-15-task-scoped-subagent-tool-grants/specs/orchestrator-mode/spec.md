# Spec Delta

## MODIFIED Requirements

### Requirement: Orchestrator mode prompt
The system MUST include the orchestrator-mode prompt section only while the mode is on. The section MUST direct the orchestrator to read and delegate, and never change files itself. It MUST direct the orchestrator to set an explicit, task-specific `tools` grant on every subagent spawn, including read-only tasks. Each brief MUST state whether the child may change files and which paths it may touch. The section MUST preserve the host failure rule: retry a task-level failure at most once on the same model, but stop and report a model or provider failure.

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

#### Scenario: Brief keeps file-change limits
- **WHEN** the orchestrator prepares a brief for a child
- **THEN** the brief states whether the child may change files and which paths it may touch

#### Scenario: Task-level failure gets at most one corrected retry
- **WHEN** a child has a task-level failure that is not caused by its model or provider
- **THEN** the orchestrator may correct the brief and retry once on the same model

#### Scenario: Model or provider failure is reported
- **WHEN** a child fails because of its model or provider
- **THEN** the orchestrator stops and reports the failure without retrying the work on another model

### Requirement: Delegated child tool grant
While orchestrator mode is on, the orchestrator MUST be able to grant a child tools beyond the mode's allowlist. Each spawn MUST include only tools needed for that task, and the grant MUST be limited to tools available to the parent. If later work needs a different grant, the orchestrator MUST spawn a new child because `send` cannot change an existing child's grant.

#### Scenario: A child receives a wider tool grant
- **WHEN** the orchestrator supplies a task-specific grant wider than the mode's allowlist
- **THEN** the built-in tool gives the child the supplied tools, if they are available to the parent

#### Scenario: A read-only task receives an explicit grant
- **WHEN** the orchestrator spawns a child for a read-only task that needs only `read`
- **THEN** it explicitly grants `read` and does not omit the `tools` argument

#### Scenario: A later task needs a different grant
- **WHEN** a later task for an existing child needs a different tool grant
- **THEN** the orchestrator spawns a new child with the needed grant instead of using `send` to change the grant
