# Spec Delta

## Purpose

Gives a person a real terminal in a browser panel, so the person runs a command in the container directly instead of
asking the agent.

## ADDED Requirements

### Requirement: Only a person who may steer can use the terminal

The extension SHALL use the access level `steer`. Any person who may steer the conversation SHALL use the terminal. A
person with the role `viewer` SHALL get the status 403 from each terminal route.

#### Scenario: A viewer opens the panel

- **WHEN** a person whose role is `viewer` calls a terminal route
- **THEN** the route answers with the status 403, and no shell starts

#### Scenario: A person who may steer types a command

- **WHEN** a person who may steer the conversation opens the panel and types `ls`
- **THEN** the shell runs `ls`, and the panel shows the output

### Requirement: Only the driver may type while take-turns is on

While take-turns is on, the module SHALL accept input only from the driver of the conversation. The module SHALL keep
the semantics of `requireDriver`. A person who is not the driver SHALL NOT send bytes to the shell. The refusal SHALL
be visible in the panel.

#### Scenario: A person who is not the driver types

- **WHEN** take-turns is on and a person who is not the driver types into the terminal
- **THEN** the shell gets no byte, and the panel shows that only the driver may type

#### Scenario: The driver types

- **WHEN** take-turns is on and the driver types into the terminal
- **THEN** the shell gets the bytes, and the output returns to the panel

### Requirement: Output arrives as coalesced frames

The module SHALL collect the shell output and send it to the browser as frames. It SHALL send at most 1 frame each
33 ms. Each frame SHALL be smaller than 256 KB, the limit of 1 event. When a frame would pass 256 KB, the module SHALL
cut it.

#### Scenario: A command makes much output

- **WHEN** the driver runs a command that writes 5 MB of output
- **THEN** the panel shows the output as a series of frames of at most 33 ms apart and smaller than 256 KB each

### Requirement: The panel gets a snapshot after a reconnect

The module SHALL keep a ring buffer of the last 64 KB of output with a sequence number. When the panel mounts, the
module SHALL send a snapshot of the buffer. The snapshot SHALL name its last sequence number, so the panel can ignore a
frame that it already has.

#### Scenario: The browser reloads the page

- **WHEN** the person reloads the browser page and the shell is still alive
- **THEN** the panel shows the last screen from the snapshot, and new output continues from the sequence number

#### Scenario: A frame comes after a snapshot

- **WHEN** the panel gets a frame whose sequence number is not after the snapshot's number
- **THEN** the panel discards the frame and shows no duplicate text

### Requirement: The terminal window has an explicit size

The module SHALL set the size of the pseudo-terminal explicitly. It SHALL NOT use the default size of a fresh
pseudo-terminal, because that size is `0 0`. When the panel changes size, the browser SHALL report the new column and
row count, and the module SHALL apply it to the shell.

#### Scenario: The panel opens

- **WHEN** the panel opens on a phone and the shell starts
- **THEN** the shell has the column and row count of the fitted renderer, and not `0 0`

#### Scenario: The person turns the phone

- **WHEN** the width of the panel changes and the renderer fits a new size
- **THEN** the module applies the new column and row count to the shell, and no `stty` line appears on the screen

### Requirement: The panel shows an explicit session end state

The module SHALL tell the panel when the shell ends. The panel SHALL show a "session ended" state with the exit status.
The panel SHALL never stop updating without a message to the person.

#### Scenario: The shell exits

- **WHEN** the shell exits with status 0
- **THEN** the panel shows "session ended" with the exit status, and the input is disabled

#### Scenario: The module reloads and the server restarts

- **WHEN** the module reloads or Pi Pocket restarts
- **THEN** the panel shows "session ended", and the last screen from `/data/pty/` stays readable

### Requirement: The module cleans up its shell and keeps a scrollback file

The module SHALL write the scrollback of the session to a file under `/data/pty/`. The module SHALL kill its child
process in `web.onDispose`. The module SHALL NOT try to reattach to a shell that a reload killed.

#### Scenario: The module disposes

- **WHEN** Pi Pocket disposes the module while a shell is alive
- **THEN** the module kills the child process, and the scrollback file is complete

#### Scenario: A new panel opens after a restart

- **WHEN** a person opens the panel after a restart
- **THEN** a shell in the panel is a new shell, and the module does not attach to an older one

### Requirement: The terminal output stays out of the model's context

The terminal SHALL NOT be a model tool. The output of the shell SHALL NOT enter Pi's prompt. The output of the shell
SHALL NOT become a tool result. The change SHALL add no tool that runs a command or writes a file that the model chose.

#### Scenario: The model looks at its context

- **WHEN** a person runs a command in the terminal and then sends a message to the agent
- **THEN** the agent's context holds the person's message and no terminal output

#### Scenario: The model asks for a command

- **WHEN** the model needs the result of a command
- **THEN** no tool of this extension runs it, and the person runs it in the terminal
