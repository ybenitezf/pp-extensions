# openspec-status Specification

## Purpose
Shows the state of the OpenSpec change that the session's folder holds: the active changes, their artifact states, and
their task progress, as a glance under the message box and as detail beside the conversation.

## Requirements

### Requirement: The status item gives the glance for the session's folder

The app SHALL show 1 status item under the message box with the OpenSpec state of the session's folder. For 1 active
change it SHALL name the change and its task counter; for more than 1 it SHALL give the count and the summed task
counter. The app cuts an item's text past 40 characters.

#### Scenario: One active change

- **WHEN** the session's folder holds 1 active change with 3 of 8 tasks done
- **THEN** the status item says the change's name and `3/8`

#### Scenario: Several active changes

- **WHEN** the session's folder holds 3 active changes with 12 of 20 tasks done in all of them
- **THEN** the status item says the count of changes and `12/20`

#### Scenario: The folder is not an OpenSpec project

- **WHEN** the session's folder, and the root of its git repository, hold no `openspec/changes/` folder
- **THEN** the app shows no status item and no panel content for the session

### Requirement: The panel shows the detail of each active change

The app SHALL show a panel beside the conversation with each active change: its name, its schema, 1 mark for each
artifact (done, ready, or blocked), a task progress bar, and its task groups. The panel SHALL say when the reading was
made.

#### Scenario: The panel is opened on an active change

- **WHEN** the person opens the panel while the session's folder holds 1 active change
- **THEN** the panel shows the change's schema, an artifact mark for each artifact, the task counter with a progress
  bar, and each `##` group of `tasks.md` with its own counter

#### Scenario: Several active changes

- **WHEN** the session's folder holds more than 1 active change
- **THEN** the panel lists each change with its own artifact marks and task progress

#### Scenario: The reading is not new

- **WHEN** the panel shows a reading that is more than 1 minute old
- **THEN** the panel says how old it is

### Requirement: The reading is scoped to the session's folder

The module SHALL read the OpenSpec project of the folder of the session that the tab shows. It SHALL find the project in
that folder, or in the root of its git repository when the folder holds no `openspec/changes/`. It SHALL NOT read or
show the project of another session.

#### Scenario: The session runs in a subfolder of the project

- **WHEN** the session's folder is inside a git repository whose root holds `openspec/changes/`
- **THEN** the status item and the panel show that project

#### Scenario: Another session runs in another folder

- **WHEN** 2 sessions run in 2 different folders that each hold an OpenSpec project
- **THEN** each session shows only its own project

### Requirement: The reading is refreshed when the state can change

The module SHALL read again when Pi ends a run, and when a tool call of Pi writes a file under `openspec/` or runs a
bash command whose text contains `openspec`. It SHALL also read on a fallback timer that starts at 30 seconds and grows
to at most 120 seconds while the reading does not change.

#### Scenario: Pi edits a task file

- **WHEN** Pi writes `openspec/changes/add-x/tasks.md`
- **THEN** the status item and the panel show the new task counter without a person asking

#### Scenario: Nothing changes

- **WHEN** the reading is the same as the reading before
- **THEN** the next fallback reading waits longer than the one before, up to 120 seconds

#### Scenario: A person asks for a new reading

- **WHEN** the person uses the panel's refresh button
- **THEN** the module reads at once

### Requirement: A failure keeps the last reading and says why

When a reading fails, the module SHALL keep the last successful reading, SHALL mark it as stale, and SHALL show the
reason in the panel. When the `openspec` command is not on the machine, the module SHALL say so instead of showing an
empty state.

#### Scenario: The command fails once

- **WHEN** the `openspec` command exits not 0 and a reading from before exists
- **THEN** the status item and the panel keep the earlier numbers, marked stale, and the panel gives the command's words

#### Scenario: The command is not installed

- **WHEN** the `openspec` command is not on the machine
- **THEN** the status item says that the command is not found, in the warning tone

#### Scenario: The project is gone

- **WHEN** the `openspec/changes/` folder is removed while a session shows its project
- **THEN** the status item and the panel content go away at the next reading

### Requirement: The panel offers the change's next action as a message

The panel SHALL give each change exactly 2 buttons: apply and archive. Each button SHALL put the skill command of the
change with the change's name into the message box of the session: `/skill:openspec-apply-change <name>` and
`/skill:openspec-archive-change <name>`. It SHALL NOT send the text. It SHALL NOT offer an explore command, a propose
command, or a `verify` command. The panel offers no other button for a change, because explore and propose do not act
on 1 change: explore is a mode of the whole session, and propose starts a new change.

#### Scenario: A person asks to apply a change

- **WHEN** the person taps the apply button of the change `add-x`
- **THEN** `/skill:openspec-apply-change add-x` is in the message box, and nothing is sent

#### Scenario: No explore, propose, or verify button exists

- **WHEN** the panel shows the buttons of a change
- **THEN** no button offers an explore, a propose, or a verify command
