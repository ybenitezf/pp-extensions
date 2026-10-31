# Design

## Context

See `proposal.md` - Why. These facts decide the approach, and each was read from Pi Pocket's own code or documentation.

- **The data folder has 3 sources.** Pi Pocket documents the data folder as `~/.pi-pocket`, or the folder that
  `PI_POCKET_DIR` gives, or the folder that the option `--data` gives.
- **The drop-in folder is `extensions/` inside the data folder.** Pi Pocket documents no other name for it.
- **A session's shell inherits `PI_POCKET_DIR`.** `/app/src/server/main.ts` writes the resolved data folder into
  `process.env`. On this machine that value is `/data`.
- **The loader reads 1 folder.** Pi Pocket reads the drop-in folder of the data folder that it resolved at startup. It
  reads no other folder, and it does not tell a session when a write went somewhere else.

## Goals / Non-Goals

**Goals:**

- 1 shell form that is correct on every install: `dropin="${PI_POCKET_DIR:-$HOME/.pi-pocket}/extensions"`.
- 1 guard that stops a write into a folder that does not exist, so that a wrong path is loud and not silent.
- The same default in `scripts/check.sh`, which reads the drop-in folder's types.

**Non-Goals:**

- No change to Pi Pocket, to `/app/docs`, or to the way that Pi Pocket resolves its data folder.
- No rewrite of the 31 archived lines that name `/data/extensions`. They record what was decided then.
- No edit of `openspec/specs/dropin-install/spec.md` by hand. The change carries a delta, and the archive step syncs it.

## Decisions

### Decision 1: The shell form is `dropin="${PI_POCKET_DIR:-$HOME/.pi-pocket}/extensions"`

The skill sets this 1 variable once, at the start of a playbook. Every command uses `"$dropin/..."`. The variable holds
the whole path, so a command cannot rebuild it in a second, different way.

Two details are part of the decision:

- **`$HOME`, never `~`, inside the quotes.** A `~` inside double quotes does not expand. `"$HOME/.pi-pocket"` does.
- **`:-`, not `-`.** With `:-`, a variable that is set to the empty string also falls back to the default. With `-`, an
  empty value passes through, and the path becomes `/extensions`.

### Decision 2: A guard runs `test -d "$dropin"` before any write

The skill runs `test -d "$dropin"` before the first write. When the command exits not 0, the skill stops and tells the
person that the drop-in folder is not there, with the path that it tested. It does not make the folder.

**Why the guard is necessary.** The expression covers `PI_POCKET_DIR` and the default folder. It cannot see the option
`--data`. So an install that runs with `--data` and no `PI_POCKET_DIR` in the shell computes a folder that Pi Pocket
never reads. A copy into a folder that a person made by hand would succeed, and it would be silent: no error, and no
module in Menu → Extensions. The guard turns that case into a stopped playbook with a path in the message. The person
then sets `PI_POCKET_DIR` to the data folder that Pi Pocket uses.

The guard does not create the folder on purpose. A folder that the playbook creates hides the same mistake: it is not the
folder that Pi Pocket reads, and it looks correct.

### Decision 3: The 31 archived lines keep the old path, and `/app/docs` stays unchanged

`openspec/changes/archive/` records decisions at the date of each change. A delta that rewrites history makes the record
false, and no later reader can tell which text was true then. This change therefore leaves every archived file as it is.
The live files that a person or an agent reads now are the 6 that the tasks name.

`/app/docs` belongs to Pi Pocket, not to this repository. It already describes the data folder and the drop-in folder
correctly, so it needs no change, and this repository must not change it.

### The delta changes 4 requirements and adds 1

The 4 changed requirements are the ones that name an absolute path: the copy, the ownership test, the browser part, and
the no-link rule. Each keeps every other sentence and scenario exactly as the main spec holds it, so a scenario cannot
get lost on the way. The 1 added requirement states the folder definition and the guard, with 2 scenarios: the variable
is set, and the folder is not there.

## Risks / Trade-offs

- **An old shell has an empty `PI_POCKET_DIR`.** `:-` falls back to `~/.pi-pocket`, and the guard then stops the
  playbook if that folder is not there. → The message names the path, so the person sees which folder was tested.
- **A person reads a skill command and retypes it without the variable.** The command then fails on `"$dropin/..."` with
  an empty value, which is loud. → The skill sets the variable in the same code block as the commands that use it.
- **`scripts/check.sh` uses a second variable name, `POCKET_DROPIN`.** It is a test hook for a folder of types, and its
  default is the same drop-in folder. → The task names the exact line, so the default cannot drift.
- **The 6 live files can drift apart again.** Nothing checks them. → The delta states 1 definition, and the review reads
  the skill first.

## Migration Plan

1. Change the skill first: definition, guard, then the commands and the prose. A session that reads the skill from then on
   writes into the right folder.
2. Change the 4 other live files, then `scripts/check.sh`.
3. Run `openspec validate --all --strict` and `./scripts/check.sh`.
4. Rollback: `git revert` of the change's commits. No server data changes, so nothing to migrate back.
