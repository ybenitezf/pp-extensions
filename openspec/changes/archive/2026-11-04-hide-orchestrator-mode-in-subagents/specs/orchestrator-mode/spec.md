# Spec Delta

## MODIFIED Requirements

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
