# Spec Delta

## MODIFIED Requirements

### Requirement: The panel offers the change's next action as a message

The panel SHALL give each change exactly 2 buttons: apply and archive. Each button SHALL put the skill command of the
change with the change's name into the message box of the session: `/skill:openspec-apply-change <name>` and
`/skill:openspec-archive-change <name>`. It SHALL NOT send the text.

#### Scenario: A person asks to apply a change

- **WHEN** the person taps the apply button of the change `add-x`
- **THEN** `/skill:openspec-apply-change add-x` is in the message box, and nothing is sent

#### Scenario: No explore, propose, or verify button exists

- **WHEN** the panel shows the buttons of a change
- **THEN** no button offers an explore, a propose, or a verify command

## ADDED Requirements

### Requirement: The panel offers no other action for a change

The panel SHALL NOT offer any button for a change other than apply and archive. Explore and propose are not buttons of a
change, because explore is a mode of the whole session and propose starts a new change.

#### Scenario: The 2 buttons of a change are all it gets

- **WHEN** the panel shows a change whose state is any of the states that the module draws
- **THEN** the change has the apply button and the archive button, and no third button
