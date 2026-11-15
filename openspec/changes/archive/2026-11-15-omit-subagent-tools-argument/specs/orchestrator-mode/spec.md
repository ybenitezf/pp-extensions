# Spec Delta

## MODIFIED Requirements

### Requirement: Orchestrator mode prompt
The system MUST include the orchestrator-mode prompt section only while the mode is on. The section MUST direct the orchestrator to read and delegate, and never change files itself. The section MUST direct the orchestrator to omit the `tools` argument from every `subagent` call. Each brief MUST state whether the child may change files and which paths it may touch.

#### Scenario: Prompt section is enabled
- **WHEN** the conversation has orchestrator mode on
- **THEN** its prompt includes the orchestrator-mode section

#### Scenario: Prompt section is disabled
- **WHEN** the conversation has orchestrator mode off
- **THEN** its prompt does not include the orchestrator-mode section

#### Scenario: Subagent calls omit the tools argument
- **WHEN** the orchestrator-mode prompt section directs the orchestrator to delegate work
- **THEN** it omits the `tools` argument from every `subagent` call

#### Scenario: Brief keeps file-change limits
- **WHEN** the orchestrator prepares a brief for a child
- **THEN** the brief states whether the child may change files and which paths it may touch
