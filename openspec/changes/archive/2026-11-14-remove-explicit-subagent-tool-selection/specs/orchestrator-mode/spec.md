# Spec Delta

## MODIFIED Requirements

### Requirement: Orchestrator mode prompt
The system MUST include the orchestrator-mode prompt section only while the mode is on. The section MUST direct the orchestrator to read and delegate, and never change files itself. The section MUST NOT require the orchestrator to set each child's tools explicitly. Each brief MUST state whether the child may change files and which paths it may touch.

#### Scenario: Prompt section is enabled
- **WHEN** the conversation has orchestrator mode on
- **THEN** its prompt includes the orchestrator-mode section

#### Scenario: Prompt section is disabled
- **WHEN** the conversation has orchestrator mode off
- **THEN** its prompt does not include the orchestrator-mode section

#### Scenario: Prompt does not mandate explicit child tool selection
- **WHEN** the orchestrator-mode prompt section directs the orchestrator to delegate work
- **THEN** it does not require the orchestrator to set each child's tools explicitly

#### Scenario: Brief keeps file-change limits
- **WHEN** the orchestrator prepares a brief for a child
- **THEN** the brief states whether the child may change files and which paths it may touch
