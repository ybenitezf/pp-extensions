# Spec Delta

## MODIFIED Requirements

### Requirement: Orchestrator mode prompt
The system MUST include the orchestrator-mode prompt section in every conversation that can hold the mode, whatever the mode state is, while the module is loaded. The section MUST begin with a state header that names the active state. With the mode on, the header MUST state that the gate is on and blocked tools stay blocked. With the mode off, the header MUST state that the gate is off, that the orchestrator holds write tools, and that delegation stays the preferred style, not a necessity. The body below the header MUST stay 1 canonical text for both states. Lines of the body whose claims hold only while the gate is on apply under the on-state header. The section MUST direct the orchestrator to read and delegate, and never change files itself. It MUST direct the orchestrator to set an explicit, task-specific `tools` grant on every subagent spawn, including read-only tasks, and to include `codemode` in that grant. Each brief MUST state whether the child may change files and which paths it may touch. The section MUST preserve the host failure rule: retry a task-level failure at most once on the same model, but stop and report a model or provider failure.

#### Scenario: Prompt section is enabled
- **WHEN** the conversation has orchestrator mode on
- **THEN** its prompt includes the orchestrator-mode section, and the state header states that the gate is on and blocked tools stay blocked

#### Scenario: Prompt section is disabled
- **WHEN** the conversation has orchestrator mode off
- **THEN** its prompt includes the orchestrator-mode section, and the state header states that the gate is off, that the orchestrator holds write tools, and that delegation stays the preferred style

#### Scenario: One canonical body
- **WHEN** the section renders with the mode on or with the mode off
- **THEN** the body below the state header is the same text

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
