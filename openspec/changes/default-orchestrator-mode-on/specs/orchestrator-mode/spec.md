# Spec Delta

## MODIFIED Requirements

### Requirement: Conversation-scoped mode state
The system MUST let a person turn orchestrator mode on and off for the current conversation. A change MUST record whether it is on, who changed it, and when. A stored state MUST survive reloads.

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
- **WHEN** a person turns orchestrator mode off in a conversation that stores no state
- **THEN** the conversation records the off state, actor, and time in 1 commit, and the mode is off after it

## ADDED Requirements

### Requirement: Mode is on by default
A conversation MUST be in orchestrator mode while it stores no mode state, and MUST NOT be in the mode when the stored state says off. The default MUST NOT need a written document, so a conversation that nobody touched is in the mode without a write.

#### Scenario: A conversation that nobody touched
- **WHEN** a person opens or messages a session that stores no mode state
- **THEN** orchestrator mode is on

#### Scenario: The composer chip of a session that stores no state
- **WHEN** a person opens a session that stores no mode state
- **THEN** the composer chip reads On, and 1 press of the chip turns the mode off

#### Scenario: A session that exists before the change
- **WHEN** the module loads with the default and a session from an earlier version stores no state
- **THEN** that session is in orchestrator mode at its next request

#### Scenario: A stored off survives a restart
- **WHEN** the server restarts after a person turned the mode off in a session
- **THEN** that session is not in orchestrator mode

#### Scenario: A fork of a session that stores off
- **WHEN** a person forks a session whose stored state says off
- **THEN** the fork is in orchestrator mode, because a fork starts from the document initial value

### Requirement: Subagent conversations never enter the mode
A subagent conversation MUST stay out of orchestrator mode. Its prompt MUST NOT hold the orchestrator section, the gate MUST NOT filter its tool calls, and the deferred and codemode offers MUST read as the source sections render them. A subagent MUST keep the tools that its parent granted.

#### Scenario: A subagent changes a file
- **WHEN** a subagent with `write` in its tools grant changes a file while its session is in orchestrator mode
- **THEN** the call proceeds

#### Scenario: A subagent runs a shell command
- **WHEN** a subagent with `bash` in its tools grant runs a shell command
- **THEN** the call proceeds

#### Scenario: The subagent prompt
- **WHEN** a subagent renders its prompt
- **THEN** the prompt holds no orchestrator-mode section, and the 2 offers are unchanged

#### Scenario: A restart during a subagent run
- **WHEN** the server restarts during a subagent run and the subagent calls a tool
- **THEN** the gate does not filter the call
