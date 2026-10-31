# Proposal

## Why

The skill `.agents/skills/extension-dropin/SKILL.md` and 5 other live files name the drop-in folder as the absolute path
`/data/extensions`. That path is correct only on 1 install: the install whose data folder is `/data`. Pi Pocket
documents its data folder as `~/.pi-pocket`, or the folder that the environment variable `PI_POCKET_DIR` or the option
`--data` gives. It documents the drop-in folder as `extensions/` inside the data folder. So the skill gives a wrong
path on every install except this machine, and an agent that follows it writes into a folder that Pi Pocket never reads.

On this machine `PI_POCKET_DIR=/data`, and `/app/src/server/main.ts` writes that value into `process.env` by design. A
shell of a Pi session inherits it. The skill can use the variable instead of the hard-coded path, and then it is correct
on every install.

## What Changes

- The skill sets the drop-in folder once, in the shell form `dropin="${PI_POCKET_DIR:-$HOME/.pi-pocket}/extensions"`. Each
  command uses `"$dropin/..."`.
- The skill tests the folder with `test -d "$dropin"` before any write. When the folder is not there, the skill stops
  and reports the path that it tested. It does not make the folder.
- 4 other live files lose the absolute path: `AGENTS.md`, `README.md`, `docs/adding-an-extension.md`, and the project
  context in `openspec/config.yaml`.
- `scripts/check.sh` gets the same default:
  `drop_in="${POCKET_DROPIN:-${PI_POCKET_DIR:-$HOME/.pi-pocket}/extensions}"`.
- The capability `dropin-install` gains 1 requirement for the folder definition and changes 4 requirements that name the
  absolute path.

## Capabilities

### Modified Capabilities

- `dropin-install`: the playbook computes the drop-in folder from the data folder, tests it before a write, and names no
  absolute path of its own. The copy, ownership, browser-part, and no-link rules keep their text, and only their path
  wording changes.

### New Capabilities

None.

## Impact

- Changed: `.agents/skills/extension-dropin/SKILL.md`, `AGENTS.md`, `README.md`, `docs/adding-an-extension.md`,
  `openspec/config.yaml`, `scripts/check.sh`.
- 31 lines under `openspec/changes/archive/` keep the old path. They record what was decided then, and this change does
  not rewrite them.
- Out of scope: `/app/docs`, the documentation of Pi Pocket itself. Pi Pocket owns that folder, and it already describes
  the data folder correctly.
- No module, tool, or command changes, so the type-check of each module keeps its result.
