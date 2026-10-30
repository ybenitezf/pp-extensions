# git-identity Specification

## Purpose
The owner types a name and an email in Pi Pocket, and the machine's global git config carries them, so that a commit
in any folder of this machine has an author without a terminal. The settings are the source of truth, and git holds a
copy.

## Requirements

### Requirement: The owner's settings hold the machine's git identity

The module SHALL declare 2 text settings, `user_name` and `user_email`, with a label, a placeholder, and a description
that names the file they fill. The values of these settings are the source of truth for the machine's global git
identity. Pi Pocket keeps them for the owner, and only the owner changes them.

#### Scenario: The owner finds both settings

- **WHEN** the owner opens Menu → Extensions and the module is on
- **THEN** the module shows a form with `User name` and `Email`, and each field says that its value goes to the global git config

#### Scenario: A new machine has both fields empty

- **WHEN** the module is on and the owner never saved the settings
- **THEN** both settings are empty, and the module has written nothing to git

### Requirement: A saved setting fills the global git config

When the owner saves the settings, the module SHALL compare each non-empty setting with the global git config, and
write each value that differs. A value that already matches SHALL NOT be rewritten. The module SHALL make the change
through git itself, so that git quotes the value and locks the file.

#### Scenario: A missing value is written

- **WHEN** the owner saves `user_name` = `Ada Lovelace` and `user_email` = `ada@example.com`, and the global config has neither
- **THEN** `git config --global --get user.name` returns `Ada Lovelace` and `git config --global --get user.email` returns `ada@example.com`

#### Scenario: A value that matches is not rewritten

- **WHEN** the owner saves an email that the global config already has
- **THEN** the module writes nothing, and the owner gets no notice

#### Scenario: A different value is overwritten

- **WHEN** the global config has `user.name` = `Old Name` and the owner saves `user_name` = `Ada Lovelace`
- **THEN** the global `user.name` is `Ada Lovelace`, and `Old Name` is no longer in the global config

#### Scenario: A value with spaces, quotes, and an equals sign survives

- **WHEN** the owner saves `user_name` = `A "B" # C = D`
- **THEN** `git config --global --get user.name` returns `A "B" # C = D` exactly

### Requirement: The module compares without a settings save

The module SHALL also compare the settings with the global git config when it loads, and when a session is created. A
value that differs SHALL be overwritten then too, so that a deleted or edited global config comes back to the settings
without the owner doing anything.

#### Scenario: A deleted global config comes back

- **WHEN** the settings hold a name, and `~/.gitconfig` is missing when the module loads
- **THEN** the global `user.name` is the value from the settings

#### Scenario: A hand edit is undone at the next session

- **WHEN** someone sets the global `user.email` to another address by hand, and a session is created after that
- **THEN** the global `user.email` is the value from the settings again

### Requirement: An empty setting leaves git alone

An empty setting SHALL NOT change the global git config. Clearing a field SHALL NOT remove a value that git has, and a
blank or whitespace-only value counts as empty.

#### Scenario: Clearing a field keeps the identity

- **WHEN** the global config has a name and an email, and the owner clears both fields and saves
- **THEN** the global name and email are unchanged

### Requirement: The owner hears what happened

The module SHALL tell the owner, with 1 notice, each time it writes a value, and shall name the keys it wrote. When a
write fails, the owner SHALL get 1 notice with git's own words. When no value changed, the owner SHALL get no notice.

#### Scenario: A write is announced

- **WHEN** the module writes both keys
- **THEN** the owner gets 1 notice that names `user.name` and `user.email`

#### Scenario: A failure is reported

- **WHEN** git refuses the write
- **THEN** the owner gets 1 notice with the words that git printed, and the module stays loaded

### Requirement: A missing git does not break the module

When the `git` program is not on the machine, the module SHALL tell the owner once, and SHALL NOT try again in that
run of the server. It SHALL stay loaded, and it SHALL change nothing.

#### Scenario: A machine with no git

- **WHEN** the module loads on a machine where `git` is not found
- **THEN** the owner gets 1 notice that says git is not installed, and 3 sessions later there is still only that notice

### Requirement: Values are checked before they go to git

The module SHALL trim each value, and SHALL NOT write a value that holds a control character, is longer than 100
characters for `user_name` or 254 for `user_email`, or does not have the shape of an email address for `user_email`.
A value that fails SHALL leave git as it was, and the owner SHALL hear why. The module SHALL NOT write the text of the
config file itself.

#### Scenario: A value with a line break is refused

- **WHEN** a setting holds a name with a line break in it
- **THEN** the global config is unchanged, and the owner gets 1 notice that the value is not valid

#### Scenario: A value without an at sign is refused for the email

- **WHEN** `user_email` holds `ada.example.com`
- **THEN** the global email is unchanged, and the owner gets 1 notice that the value is not an email address

### Requirement: The module changes nothing else

The module SHALL write only `user.name` and `user.email`, and SHALL NOT change another git key, another person's config,
or a local repository's config. It SHALL install no tool, no command, no route, and no browser module.

#### Scenario: Other git settings are untouched

- **WHEN** the global config holds `core.editor` and `init.defaultBranch`, and the module writes both keys
- **THEN** `core.editor` and `init.defaultBranch` are exactly as they were

#### Scenario: A local repository is untouched

- **WHEN** the module writes to the global config
- **THEN** the `.git/config` of the folder that a session works in is unchanged

### Requirement: The module needs Pi Pocket 0.22.0

The module SHALL use the extension API level 1, and it SHALL need Pi Pocket 0.22.0 for the settings API. On an older
server it SHALL tell the owner what it needs, and it SHALL change nothing.

#### Scenario: An older server

- **WHEN** the module loads on a Pi Pocket that has no `web.settings`
- **THEN** the owner gets 1 notice that the module needs Pi Pocket 0.22.0, and git is unchanged
