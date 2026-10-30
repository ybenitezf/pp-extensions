# Proposal

## Why

This repository reaches into Pi Pocket's drop-in folder, `/data/extensions`, with a symbolic link, and that link points
into a Pi session worktree. A worktree can be removed at any time, the link is stale today (it points at a worktree 6
commits behind), and no module with a browser part can use it at all: Pi Pocket refuses a `web.client` that is a link.

`/data/extensions` belongs to Pi Pocket and to its gallery. This repository must put a module there only while the owner
tests it, by copying it in and taking it out again by hand. An agent needs 1 source of truth for that procedure, so that
no session overwrites another person's extension, leaves a file behind, or makes a link again.

## What Changes

- Add a skill, `.agents/skills/extension-dropin/SKILL.md`, with 2 playbooks: **install/update** and **uninstall**. This
  becomes the source of truth for how a module of this repository goes into `/data/extensions` and leaves it.
- Point every other page at the skill instead of repeating the steps: `README.md`, `docs/adding-an-extension.md`,
  `AGENTS.md`, `extensions/_template/README.md`, and the project context in `openspec/config.yaml`.
- **BREAKING**: delete `scripts/link.sh`. It exists only to make the link this change rules out, and 2 rules that
  disagree are worse than none.
- Remove the stale link `/data/extensions/git-identity.ts`. It is not a file of this repository, so nothing is committed
  for it; the task is in this change so that the server stops loading a module out of a worktree.
- Out of scope: extensions that Pi Pocket installed and this repository does not hold, such as `subscription-usage`, are
  not ours and the playbooks never touch them. There is no script, no watcher, and no ledger file.

## Capabilities

### New Capabilities

- `dropin-install`: how 1 module of this repository reaches Pi Pocket's drop-in folder and leaves it again: the 2
  playbooks, the rule that copies never links, the ownership test before any write or removal, the browser part that must
  travel with the module, and the fact that a copied-in module stays off until the owner turns it on.

### Modified Capabilities

None. The behavior of the modules, `git-identity` included, does not change; only how a module is installed for a test.

## Impact

- New: `.agents/skills/extension-dropin/SKILL.md`.
- Changed: `README.md`, `docs/adding-an-extension.md`, `AGENTS.md`, `extensions/_template/README.md`,
  `openspec/config.yaml` (the project context sentence that names the links).
- Deleted: `scripts/link.sh`.
- Outside the repository, not committed: the symbolic link `/data/extensions/git-identity.ts`.
- No module, tool, or command changes, so `scripts/check.sh` keeps its result.
