# Design

## Context

See `proposal.md` - Why. The facts below shape the approach, and each was read from Pi Pocket's own code, not assumed.

- **A module is found by file name.** The loader lists `/data/extensions` with `readdirSync` and keeps names that end
  with `.ts` (`src/server/reload.ts`, `moduleFiles`). A name it cannot load is still listed, so a broken entry shows up
  instead of disappearing.
- **The on/off choice is keyed to the file name**, not to a path or an inode (`#isOn` calls `choice(module.file)`, and
  the config keeps `enabledExtensions: ["git-identity.ts"]`). A module copied in again under the same name comes back on.
- **A drop-in starts off only with no recorded choice.** A drop-in with no recorded choice is off, a built-in with none
  is on, and a drop-in whose file name has a recorded choice comes back with that choice (`#isOn`).
- **A browser part cannot be a link.** `web.client` must name a file or folder right beside the module, and Pi Pocket
  refuses one that is a link: `web.client: <entry> is a link: give the file or folder itself`
  (`src/server/extension-web.ts`).
- **The real layout of an installed extension** is visible in the gallery's own install: `subscription-usage.ts`, the
  folder `subscription-usage/` with `index.js` and `look.css`, and the sidecar `subscription-usage.gallery.json`.
- **The drop-in folder is watched non-recursively** (`reload.ts`, `watch(directory, ...)`), so writing
  `/data/extensions/<name>/index.js` raises no event there. Only a top-level entry does.
- **A failed load keeps the old code**: "Keeps the old code when the new one fails."

## Goals / Non-Goals

**Goals:**

- 1 skill that an agent reads and follows by hand, with 2 playbooks that do not depend on each other.
- Every other page points at the skill, so the repository has 1 answer to "how does a module get into Pi Pocket?".
- The guards that keep another person's extension safe are written down once, where the agent reads them.

**Non-Goals:**

- No script, no watcher, no daemon, no ledger file, no state kept between runs. The owner rejected all of them.
- No install from the gallery, and no publishing. The gallery keeps its own sidecar and its own update path.
- No change to any module, so no change to the `git-identity` spec and no new module-level requirement.
- No cleanup step inside the install playbook: removal is the uninstall playbook's whole job.

## Decisions

### A skill, not more rules in `AGENTS.md`

`AGENTS.md` is read at the start of every session in this repository, so every sentence there is paid for by every
session, including the ones that never install anything. A skill is advertised by its name and description, and its body
loads only when an install or an uninstall is actually asked for. `AGENTS.md` keeps 1 line that points at the skill.

*Alternative considered:* the whole procedure in `AGENTS.md`. Rejected: it makes the rules file long, and a long rules
file gets skimmed rather than followed, which is exactly the failure this change is about.

### Location and name

`.agents/skills/extension-dropin/SKILL.md`, in the same tree as the 4 skills this repository already holds
(`.agents/skills/openspec-*/`). Pi discovers `.agents/skills/` from the working directory up to the repository root, so
the skill travels with the worktree and needs no installation of its own.

Name `extension-dropin`: lowercase and hyphens, as the Agent Skills specification requires, 16 characters. The
description states what it does *and when it applies* - "install, update, or remove one of this repository's extensions
in Pi Pocket's drop-in folder" - because the description is the only part the model sees before it decides to load the
skill.

*Alternative considered:* a `docs/*.md` page read by hand. Rejected: nothing routes an agent to it at the moment of the
task, which is when the guards matter.

### 2 playbooks in 1 skill file, not 2 skills

Install and uninstall share the same small set of facts: what is ours, what a copy is, what the browser part is, and
where the folder is. Splitting them would duplicate those facts and let the two drift. They stay separate *sections* so an
agent reads only the one it needs and cannot confuse "copy it" with "keep it".

The install playbook covers **install and update** with one step, because an update is the same copy: the file is already
ours, so the ownership test passes and the copy replaces it. Pi Pocket then reloads the module, and the on/off state
survives because it is keyed to the file name.

### Ownership is prove by bytes, not by a marker file

The test before any write or removal is `cmp -s extensions/<name>/<name>.ts /data/extensions/<name>.ts`. Equal means
ours; anything else means the playbook stops and reports.

*Alternatives considered:*

- A marker file beside the module, such as `<name>.dev.json`. Rejected: it is one more thing in a folder that belongs to
  Pi Pocket, and it must be kept in step with the files it describes. It also invites a collision with the gallery's own
  `<name>.gallery.json` convention.
- A ledger inside the worktree recording what was copied. Rejected: it dies with the worktree, which is the very event
  this change is about.
- Byte-equality alone is enough, and needs no state at all: it works after a crash, after a worktree is deleted, and for a
  session that never ran the install.

The cost is honest: a copy that the owner edited *in the drop-in folder* no longer proves as ours, so the playbook stops
rather than deleting the owner's edit. The remedy is stated in the skill: edit the module in the repository, then copy it
again.

### The browser part is a folder with the module's own name

The playbook copies `extensions/<name>/<name>.ts`, and when `extensions/<name>/<name>/` exists, that folder too, to
`/data/extensions/<name>/`. This matches both the gallery's own layout and the loader's rule that a client sits beside
its module. `README.md` and `*.test.ts` stay behind: the first is for people, the second is not loaded, and neither is a
browser part.

A helper that a module imports (`_helper.ts`) must also travel, because an import outside the drop-in folder is refused.
No module here has one today; the playbook says so in 1 line so the first module that needs it is not surprised.

### After an edit, the copy is the reload

Pi Pocket watches `/data/extensions`, not the worktree, and it watches it non-recursively. Two consequences the playbook
states plainly:

- An edit reaches the server only when the module is copied again. There is no watcher by design.
- An edit to a browser part alone is not seen by that watcher. Copying the module again is what makes Pi Pocket reload
  and compute the new revision of the browser files, so the playbook copies the module together with its parts, always,
  rather than copying a client file on its own.

### The rest of the docs point at the skill

`README.md`, `docs/adding-an-extension.md` (step 3 and the "use an extension" steps), `extensions/_template/README.md`,
`AGENTS.md` (the intro, the file list, and a new rule), and the project context in `openspec/config.yaml` all lose their
link instructions and gain either the 2 steps they need or a pointer to the skill. None of them repeats the guards: a
second copy of a rule is a second thing to keep right.

### `scripts/link.sh` is deleted, not deprecated

It has one purpose, and that purpose is now forbidden. A script that still works and still produces the broken state is a
trap for the next session; a deleted script is a fact. `scripts/check.sh` stays as it is.

## Risks / Trade-offs

- **An agent copies in and never removes.** The install playbook says the removal is the other playbook, and the skill's
  description names uninstall, so the routing to it exists. The spec keeps the rule; a session that forgets leaves a file
  that is inert while it has no recorded "on" choice, which is the least harmful leftover available. → The uninstall
  playbook starts from the same ownership test, so it also works when a different session did the install.
- **The install needs 1 click from the owner.** No session can turn a module on. This is a cost of Pi Pocket's design
  and is the right one: a module runs because the owner chose it, and not because a session copied a file. A copy under
  a name that the owner already turned on comes back on, and that choice is the owner's, not the session's. → The
  playbook tells the owner in its last step, and does not pretend the module runs.
- **A module edited in the drop-in folder stops proving as ours.** Removal then stops and asks. → Stated in the skill as
  a rule: change the module in the repository, then copy it again.
- **Byte-equality is a weaker proof than an install record** when a module is copied by hand with a stale tree. → The
  playbook copies from the module the repository holds now; a stale copy differs from every module until it is replaced,
  and a difference is exactly what the test reports.
- **The stale link is still live until the task runs.** Until it is removed, Pi Pocket keeps loading `git-identity` out of
  a worktree 6 commits behind. → It is the first task of the change.
- **Doc drift returns.** 6 pages must agree with 1 skill, and nothing checks them. → The spec forbids a page that repeats
  the steps, which keeps the pages short enough to keep right, and it becomes a review question rather than a memory test.

## Migration Plan

1. Remove the stale link: `rm /data/extensions/git-identity.ts`. Pi Pocket uninstalls that drop-in and says so. The file
   it pointed at is not touched.
2. Add the skill, then point the pages at it, then delete `scripts/link.sh` - in that order, so no page is ever pointing
   at a missing source of truth.
3. To put `git-identity` back into Pi Pocket afterwards, follow the install playbook by hand. That is the same path the
   skill describes, and it is also the first real test of it.
4. Rollback: `git revert` of the change's commits, plus `cp` of the module back into `/data/extensions` by hand. No
   server data changes, so nothing to migrate back.
