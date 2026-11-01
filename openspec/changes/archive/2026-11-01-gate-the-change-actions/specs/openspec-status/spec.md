# Spec Delta

## MODIFIED Requirements

### Requirement: The panel offers the change's next action as a message

The panel SHALL offer each change only the buttons that have work to do. Apply SHALL show only while the change's
`tasks` artifact is done and not every task is checked. Archive SHALL show for a change that has 1 artifact done or 1
task line. Each button SHALL put the skill command of the change with the change's name into the message box of the
session: `/skill:openspec-apply-change <name>` and `/skill:openspec-archive-change <name>`. It SHALL NOT send the text.

#### Scenario: A person asks to apply a change

- **WHEN** the person taps the apply button of the change `add-x`
- **THEN** `/skill:openspec-apply-change add-x` is in the message box, and nothing is sent

#### Scenario: Every task is checked

- **WHEN** every task line of a change is checked
- **THEN** the change has no apply button, and it keeps its archive button

#### Scenario: The tasks are not written yet

- **WHEN** a change has 1 artifact done and no `tasks.md`
- **THEN** the change has no apply button, and it keeps its archive button

#### Scenario: No explore, propose, or verify button exists

- **WHEN** the panel shows the buttons of a change
- **THEN** no button offers an explore, a propose, or a verify command

### Requirement: The panel offers no other action for a change

The panel SHALL NOT offer any button for a change other than apply and archive. Explore and propose are not buttons of a
change, because explore is a mode of the whole session and propose starts a new change.

#### Scenario: The 2 buttons of a change are all it gets

- **WHEN** the panel shows a change whose state is any of the states that the module draws
- **THEN** the change has at most the apply button and the archive button, and no third button

## ADDED Requirements

### Requirement: A row with no action says so in words

The panel SHALL give 1 short muted line in the place of the buttons when a change has no button, and SHALL name why the
apply button is not there when the row keeps only archive. The line SHALL come from the state of the reading.

#### Scenario: Nothing is written yet

- **WHEN** a change has no artifact done and no task line
- **THEN** its row shows no button, and the muted line says `nothing to act on yet`

#### Scenario: Every task is checked

- **WHEN** every task line of a change is checked
- **THEN** the muted line of its row says `all tasks done`

#### Scenario: The tasks are not written yet

- **WHEN** a change has 1 artifact done and no `tasks.md`
- **THEN** the muted line of its row says `no tasks yet`

#### Scenario: The change has work to apply

- **WHEN** a change has an open task line and its `tasks` artifact is done
- **THEN** its row shows both buttons, and no muted line
