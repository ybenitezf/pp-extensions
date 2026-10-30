# Spec Delta

## Purpose

How 1 module of this repository reaches Pi Pocket's drop-in folder for a test, and how it leaves again: a copy in, a
copy out, never a link, and never a file that belongs to somebody else.

## ADDED Requirements

### Requirement: One source of truth for the procedure

The repository SHALL keep the install and uninstall procedure in 1 skill, with 1 playbook for install and update and 1
playbook for uninstall. Every other page that tells a person or an agent how a module reaches the drop-in folder SHALL
point at that skill instead of repeating the steps.

#### Scenario: An agent is asked to install a module

- **WHEN** the owner asks for the installation of a module that this repository holds
- **THEN** the skill names the steps, and no other page in the repository gives a second version of them

#### Scenario: A page disagrees with the skill

- **WHEN** a page of the repository tells a person to run a script that makes a link in the drop-in folder
- **THEN** that page is wrong, and the skill is the source of truth

### Requirement: A module enters the drop-in folder as a copy

The install playbook SHALL copy `extensions/<name>/<name>.ts` to `/data/extensions/<name>.ts`. It SHALL NOT make a
symbolic link, and it SHALL remove a link it finds there before it copies.

#### Scenario: The installed module is a copy

- **WHEN** the playbook has installed `<name>`
- **THEN** `/data/extensions/<name>.ts` is a regular file, and it is byte-equal to the module of this repository

#### Scenario: A link is in the way

- **WHEN** `/data/extensions/<name>.ts` is a symbolic link, as the link of `git-identity` was
- **THEN** the playbook removes the link and copies the module, and the module it pointed at stays where it was

### Requirement: The playbook stops at a file that is not ours

Before it writes or removes anything, the install and uninstall playbooks SHALL compare the file in the drop-in folder
with the module of this repository. A file that differs, or that this repository does not hold, SHALL NOT be overwritten
or removed. The playbook SHALL stop and tell the owner what it found there.

#### Scenario: Another person's extension has the name

- **WHEN** `/data/extensions/<name>.ts` exists with bytes that differ from the module
- **THEN** nothing is written and nothing is removed, and the owner hears what is in the way

#### Scenario: The installed copy is ours

- **WHEN** `/data/extensions/<name>.ts` is byte-equal to the module
- **THEN** the playbook replaces it on install, and removes it on uninstall

### Requirement: The browser part travels with the module

When a module has a browser part, the install playbook SHALL copy that file or folder beside the module in the drop-in
folder, with the same name, and the uninstall playbook SHALL remove it. `README.md` and `*.test.ts` SHALL NOT be copied.

#### Scenario: A module with a page is installed

- **WHEN** the module declares a `web.client` that is the folder `<name>/`
- **THEN** `/data/extensions/<name>/` holds the same files as `extensions/<name>/<name>/`, and each of them is a regular
  file or folder, not a link

#### Scenario: The page's module is uninstalled

- **WHEN** the owner is done with a module that has a browser part
- **THEN** the playbook removes both `/data/extensions/<name>.ts` and `/data/extensions/<name>/`

### Requirement: The owner turns the module on

The install playbook SHALL tell the owner that a copied-in module starts off, and that only the owner turns it on in
Menu → Extensions. It SHALL NOT claim that the module runs, and it SHALL NOT wait for it to run.

#### Scenario: The module does not run yet

- **WHEN** the module is copied in and nobody has turned it on
- **THEN** the owner hears that the module is off, and that the next step is theirs

### Requirement: A copy is what makes Pi Pocket load the new code

The install playbook SHALL say that Pi Pocket loads the copy, and that an edit in the repository reaches the server only
when the module is copied again. It SHALL NOT point at a watcher, a script, or a link that does the copy.

#### Scenario: The module is edited after the install

- **WHEN** the module changes in this repository and the copy is not made again
- **THEN** Pi Pocket keeps running the code it copied, and the playbook's next step is the copy again

### Requirement: Uninstall leaves the drop-in folder as it was found

The uninstall playbook SHALL remove the files that the install playbook copied, and nothing else. It SHALL NOT remove
`_pocket.d.ts`, `node_modules`, a `<name>.gallery.json`, or any file that is not byte-equal to a module of this
repository.

#### Scenario: The folder is as it was

- **WHEN** the owner is done and the playbook has uninstalled the module
- **THEN** the drop-in folder holds what Pi Pocket had before the install, and the module's entry is gone from
  Menu → Extensions

#### Scenario: A gallery file is beside the module

- **WHEN** the drop-in folder holds `<name>.gallery.json` or another extension's files
- **THEN** they stay as they are, and only the files that this repository copied are removed

### Requirement: No script makes a link in the drop-in folder

The repository SHALL NOT hold a script whose purpose is to put a module into the drop-in folder. `scripts/check.sh` keeps
its purpose: it type-checks a module against the drop-in folder's types.

#### Scenario: A returning link script

- **WHEN** a change adds a script that makes a link from a worktree into `/data/extensions`
- **THEN** this capability is broken, because a worktree can be removed at any time and a browser part cannot be a link
