# Proposal

## Why

Git needs a name and an email before it makes a commit. A person gets them from the global file `~/.gitconfig`, and
every folder without its own git config uses those values. On a machine where that file is missing, each new folder
fails at its first commit with "please tell me who you are", and the person has to leave Pi Pocket for a terminal to
fix it. This repository's own machine shows the case: `~/.gitconfig` does not exist, and the identity that works here
comes only from one repository's local config.

Pi Pocket already has a form for a module's settings, in Menu → Extensions. With 1 module, the owner can type a name and
an email once, and the machine keeps them.

## What Changes

- Add the module `extensions/git-identity/git-identity.ts`. It declares 2 settings, `user_name` and `user_email`, and
  those settings are the source of truth for the machine's global git identity.
- The module compares the settings with the global git config, and writes each value that differs. It writes with
  `git config --global`, so git builds the file, quotes the values, and locks it. The module never writes
  `~/.gitconfig` itself.
- The comparison runs at 3 moments: when the owner saves the settings, when the module loads, and when a session is
  created.
- A value that differs is overwritten. A value that matches is left as it is. An empty setting leaves git alone, so
  clearing a field does not delete an identity that the machine already has.
- The module tells the owner 1 notice when it writes a value, and 1 notice with git's words when a write fails. When
  git is not installed, the owner gets 1 notice, and the module stays quiet after that.
- The module has no tool, no command, no route, and no browser module. It installs 1 extension, with settings only.

## Capabilities

### New Capabilities

- `git-identity`: the owner's settings fill the machine's global git identity. The capability covers the settings, when
  the module compares and writes, what it does with an empty setting and with a value that is already there, what the
  owner is told, and what happens when git is missing or a write fails.

### Modified Capabilities

None. The repository has no specs yet.

## Impact

- New files: `extensions/git-identity/git-identity.ts`, and its folder.
- `scripts/link.sh` links the new module into `/data/extensions`. The link is not committed.
- `scripts/check.sh` type-checks the new module.
- `index.entries.json` gets an entry for the module after its first release, not in this change.
- No change to Pi Pocket's own code.
- The module needs Pi Pocket 0.22.0: `web.settings`, `web.setting`, `web.onSettings`, and `host.on` came in that
  release, and they are experimental. The module checks that each one is there before it uses it.
- The module reads and writes `~/.gitconfig` through `git`. It writes nothing else outside Pi Pocket, and it reads no
  secret. Its description says so, as the security model asks (S1.1, S1.2).
- It needs no `pocketApi` 2: no tool of it returns `output`. Without the export, the module is at API version 1, and its real floor is Pi Pocket 0.22.0.
