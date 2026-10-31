# Spec Delta

## MODIFIED Requirements

### Requirement: A module enters the drop-in folder as a copy

The install playbook SHALL copy `extensions/<name>/<name>.ts` to `<dropin>/<name>.ts`, where `<dropin>` is `extensions/`
in Pi Pocket's data folder. It SHALL NOT make a symbolic link, and it SHALL remove a link it finds there before it
copies.

#### Scenario: The installed module is a copy

- **WHEN** the playbook has installed `<name>`
- **THEN** `<dropin>/<name>.ts` is a regular file, and it is byte-equal to the module of this repository

#### Scenario: A link is in the way

- **WHEN** `<dropin>/<name>.ts` is a symbolic link, as the link of `git-identity` was
- **THEN** the playbook removes the link and copies the module, and the module it pointed at stays where it was

### Requirement: The playbook stops at a file that is not ours

Before it writes or removes anything, the install and uninstall playbooks SHALL compare the file in the drop-in folder,
`extensions/` in Pi Pocket's data folder, with the module of this repository. A file that differs, or that this
repository does not hold, SHALL NOT be overwritten or removed. The playbook SHALL stop and tell the owner what it found
there.

#### Scenario: Another person's extension has the name

- **WHEN** `<dropin>/<name>.ts` exists with bytes that differ from the module
- **THEN** nothing is written and nothing is removed, and the owner hears what is in the way

#### Scenario: The installed copy is ours

- **WHEN** `<dropin>/<name>.ts` is byte-equal to the module
- **THEN** the playbook replaces it on install, and removes it on uninstall

### Requirement: The browser part travels with the module

When a module has a browser part, the install playbook SHALL copy that file or folder beside the module in the drop-in
folder, with the same name, and the uninstall playbook SHALL remove it. `README.md` and `*.test.ts` SHALL NOT be copied.

#### Scenario: A module with a page is installed

- **WHEN** the module declares a `web.client` that is the folder `<name>/`
- **THEN** `<dropin>/<name>/`, where `<dropin>` is `extensions/` in Pi Pocket's data folder, holds the same files as
  `extensions/<name>/<name>/`, and each of them is a regular file or folder, not a link

#### Scenario: The page's module is uninstalled

- **WHEN** the owner is done with a module that has a browser part
- **THEN** the playbook removes both `<dropin>/<name>.ts` and `<dropin>/<name>/`

### Requirement: No script makes a link in the drop-in folder

The repository SHALL NOT hold a script whose purpose is to put a module into the drop-in folder. `scripts/check.sh` keeps
its purpose: it type-checks a module against the drop-in folder's types.

#### Scenario: A returning link script

- **WHEN** a change adds a script that makes a link from a worktree into `<dropin>`, which is `extensions/` in Pi
  Pocket's data folder
- **THEN** this capability is broken, because a worktree can be removed at any time and a browser part cannot be a link

## ADDED Requirements

### Requirement: The playbook finds the drop-in folder from the data folder

The playbook SHALL set the drop-in folder from `PI_POCKET_DIR`, with `~/.pi-pocket` as the default when the variable is
not set, and it SHALL use that folder for every command. It SHALL NOT name an absolute path of its own. It SHALL test
that the folder exists before any write, and it SHALL stop and report the path when the folder is not there.

#### Scenario: The variable is set

- **WHEN** `PI_POCKET_DIR` is set
- **THEN** every command uses `$PI_POCKET_DIR/extensions`

#### Scenario: The folder is not there

- **WHEN** the folder that the playbook computes does not exist
- **THEN** the playbook stops before any write, and reports the path that it tested
