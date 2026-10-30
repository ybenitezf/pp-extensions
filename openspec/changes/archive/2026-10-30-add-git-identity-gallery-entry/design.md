# Design

## Context

See `proposal.md` - Why.

- The gallery is driven by `index.entries.json` at the repository root. It has `format: 1`, a `name`, a `repo`, and an
  `extensions` array that today holds **one** object, `my-example`.
- Pi Pocket's gallery reads only `source.commit` (a 40-hex commit id) and each file's `sha256` and `size`. `version` is
  "the author's version, for people". The gallery never reads a git tag or a GitHub release.
- The repository currently has 0 tags and 0 releases. The module is merged at
  `65fea20037191c244ed2d34dcd6bdb39c356e35a`.
- This repository has no local gallery-entry validator. Pi Pocket's own parser is
  `/app/src/server/gallery/entry.ts` `parseEntry`. Files in `/app` must not be changed; that file is read only, as the
  reference for the check.
- `openspec/changes/archive/2026-10-30-add-git-identity/tasks.md` lines 80-82 defer the entry to "after the first
  release". An archived change must not be edited.
- GitHub issue #3 tracks this work. Its body says to replace the example entry, and it must not be changed.

## Goals / Non-Goals

**Goals:**

- Add the `git-identity` entry to `index.entries.json` as the second item of `extensions`, with values that
  `parseEntry` accepts.
- Keep `my-example` in place as the worked example.
- Record, without editing the archived change, that its deferred gallery task is superseded.

**Non-Goals:**

- No git tag, no GitHub release, no GitHub write, no comment on issue #3.
- No change to `extensions/git-identity/git-identity.ts`, so no `scripts/check.sh` run.
- No edit of any file in `/app`, and no local copy of `parseEntry`.
- No new capability spec; the change is repository metadata only.

## Decisions

### D1. No "first release" gate

**DECISION: the project's "first release" gate is DROPPED.** The entry goes in with no git tag and no GitHub release
before it. Evidence: the gallery reads only `source.commit` (a 40-hex commit id) and each file's `sha256` and `size`;
`version` is "the author's version, for people"; the gallery never reads a tag or a release. The repository currently
has 0 tags and 0 releases. The superseded alternative is the archived task's order: tag a release first, then add the
entry. That order adds a step the gallery never reads, so it is dropped.

### D2. Add, do not replace

The `my-example` entry **STAYS** as the worked example. The new object is **ADDED after it**, as the second item of
the `extensions` array. The "replace the example entry" instruction in issue #3 is superseded by this decision; issue
#3 itself is not changed.

### D3. The exact entry object

Add this object to the `extensions` array, as the second item:

```json
{
  "name": "git-identity",
  "title": "Keep git identity equal to 2 Pi Pocket settings",
  "description": "Keeps the machine's git identity in step with 2 settings: `User name` and `Email`.",
  "tags": ["git", "git-config", "identity", "settings", "user-name", "user-email", "commit-author"],
  "author": { "name": "ybenitezf", "github": "ybenitezf" },
  "version": "0.1.0",
  "source": { "repo": "ybenitezf/pp-extensions", "commit": "65fea20037191c244ed2d34dcd6bdb39c356e35a", "path": "extensions/git-identity" },
  "files": [ { "name": "git-identity.ts", "sha256": "9d8a4496d7bd912fc256108014ca165572bb0f3b3599e3722d39d9155933731a", "size": 22349 } ],
  "pocketApi": 1,
  "minPocket": "0.22.0",
  "declares": { "extensions": ["git-identity"], "tools": [], "readOnlyTools": [], "hooks": [], "sections": [], "wraps": [], "routes": [], "client": null, "access": "owner" }
}
```

Note: unlike the `my-example` object, this object has no `declares.commands` field, because the module registers no
command. Do not add a field that the object does not have above.

### D4. Why each value

- `pocketApi: 1`: the module exports no `pocketApi`; a module with no export counts as version 1, and a gallery entry's
  `pocketApi` is the same number as the module's.
- `declares.hooks: []`: the module registers no hook handler. Its `host.on("session.created", ...)` is an app event
  listener, not a hook handler.
- `access: "owner"`: the module adds no route and no browser module.
- `minPocket: "0.22.0"`: the module needs `web.settings`, `host.on`, and `host.notice`; it says so at line 27.
- `sha256` and `size`: confirmed by fetching the file at commit `65fea20…` from `raw.githubusercontent.com`; HTTP 200,
  22349 bytes.
- `version: "0.1.0"`: the author's version, for people. It is not a tag, and no tag is required.

### D5. Check with `parseEntry`, not a local script

`/app/src/server/gallery/entry.ts` `parseEntry` is the only authority in reach. The finished `index.entries.json` is
checked by reading that parser and comparing field by field: required fields present, `commit` 40 hex characters,
`sha256` 64 hex characters, `size` a positive number, `pocketApi` a number, `minPocket` a string, `declares` an object
with the keys `parseEntry` reads, and `access` one of the values it accepts. Do not add a validator to this repository as
part of this change.

### D6. One commit, `chore:`

The edit is one metadata change to one file, so it is one commit with a `chore:` message, for example
`chore: add the git-identity gallery entry`. `scripts/check.sh` type-checks modules only; this change touches no module,
so that script is not part of the work.

## Risks / Trade-offs

- [A value that `parseEntry` refuses breaks the whole index for every reader] → Check the finished file field by field
  against `/app/src/server/gallery/entry.ts` before the commit, and keep the values exactly as D3 gives them.
- [A later commit moves the branch, so `source.commit` stops matching the file in `files`] → Deliberate tolerance: the
  entry pins one commit id. If the module changes, a later change updates `commit`, `sha256`, and `size` together.
- [The example entry is removed by mistake, or put in another place] → `my-example` stays; the new object is appended as
  the second item. The diff must show one added object and no removed line inside the `my-example` object.
- [Somebody edits the archived change to close the deferred task] → Do not edit
  `openspec/changes/archive/2026-10-30-add-git-identity/`. The supersession is recorded in this change only.
- [A 40-hex or 64-hex id is shortened or reformatted by a tool] → Keep the ids as single unbroken strings.

## Migration Plan

1. Add the object from D3 to `index.entries.json`, as the second item of `extensions`.
2. Check the finished file against `/app/src/server/gallery/entry.ts` `parseEntry`.
3. Commit with `chore: add the git-identity gallery entry`, and push only the current branch with
   `git push origin HEAD`.

Rollback: remove the one added object and commit that removal. No tag, no release, and no other file is involved.
