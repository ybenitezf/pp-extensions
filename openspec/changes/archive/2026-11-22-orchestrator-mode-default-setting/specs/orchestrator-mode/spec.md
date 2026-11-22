# Spec Delta

## MODIFIED Requirements

### Requirement: Conversation-scoped mode state
The system MUST let a person turn orchestrator mode on and off for the current conversation. A change MUST record whether it is on, who changed it, and when. A stored state MUST survive reloads. When no state is stored, a toggle MUST capture the current `default_on` value and invert it.

#### Scenario: Turn mode on
- **WHEN** a person turns orchestrator mode on
- **THEN** the current conversation records the on state, actor, and time

#### Scenario: Turn mode off
- **WHEN** a person turns orchestrator mode off
- **THEN** the current conversation records the off state, actor, and time

#### Scenario: Reload an enabled conversation
- **WHEN** an enabled conversation reloads
- **THEN** orchestrator mode remains on

#### Scenario: First press in a session with no stored state
- **WHEN** a person toggles orchestrator mode in a conversation that stores no state
- **THEN** the conversation records the inverse of the captured `default_on` value, actor, and time in 1 commit, and the mode matches that inverse

#### Scenario: A toggle inverts the captured value
- **WHEN** a person toggles orchestrator mode in a conversation that captured a value, and the owner changed `default_on` after that capture
- **THEN** the conversation records the inverse of the captured value, actor, and time

### Requirement: Mode is on by default
A conversation with no mode state MUST capture the current `default_on` value at its first mode resolution that can write, which is its first chip read or first toggle. The read-only paths, the prompt and tool gate, MUST resolve the current setting only while the conversation stores no record. It MUST keep that captured value until a toggle replaces it, and it MUST survive reloads and restarts. The default MUST be true. A conversation that never resolved the mode follows the current setting.

#### Scenario: A conversation that nobody touched
- **WHEN** a person opens a session that stores no mode state
- **THEN** the chip read captures the current `default_on` value and the session keeps it

#### Scenario: The composer chip of a session that stores no state
- **WHEN** a person opens a session that stores no state
- **THEN** the chip read captures the current `default_on` value, and 1 press toggles that captured value

#### Scenario: A session that exists before the change
- **WHEN** the module loads with a configured default and a session from an earlier version stores no state
- **THEN** that session captures the configured default at its next mode resolution

#### Scenario: A stored off survives a restart
- **WHEN** the server restarts after a person turned the mode off in a session
- **THEN** that session is not in orchestrator mode

#### Scenario: A captured value survives a change of the setting and a restart
- **WHEN** the owner changes `default_on` and the server restarts after a session captured a value
- **THEN** that session keeps its captured value

#### Scenario: A fork of a session that stores off
- **WHEN** a person forks a session and the fork stores no mode state
- **THEN** the fork captures the current `default_on` value at its own first use, whether or not the source session stores off

## ADDED Requirements

### Requirement: Owner-controlled default mode setting
The module MUST declare one owner setting named `default_on` as a boolean with a label and default value `true`. Only the owner can change it in Menu → Extensions. When the settings API is absent, the module MUST preserve the current on-by-default behavior.

#### Scenario: The setting is available to the owner
- **WHEN** the module runs on a host with the settings API
- **THEN** Menu → Extensions shows one boolean `default_on` setting for the module with default value `true`

#### Scenario: The owner changes the default
- **WHEN** the owner changes `default_on`
- **THEN** a conversation that never resolved the mode uses the new setting value, while a conversation that captured a value keeps that captured value

#### Scenario: The settings API is absent
- **WHEN** the module runs on a host without the settings API
- **THEN** it does not require the setting and a conversation with no stored state remains in orchestrator mode
