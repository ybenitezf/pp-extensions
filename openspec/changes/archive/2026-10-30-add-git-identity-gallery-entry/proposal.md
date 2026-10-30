# Proposal

## Why

`git-identity` (merged as `65fea20037191c244ed2d34dcd6bdb39c356e35a`) is not listed in `index.entries.json`, so nobody
who reads the gallery can find it. An archived task delays that entry until "the first release":

> `openspec/changes/archive/2026-10-30-add-git-identity/tasks.md` lines 80-82: "After the first release, add the
> gallery entry to `index.entries.json`, with the `sha256` and size that Menu → Extensions → **Installed** → **Share…**
> gives, `minPocket: "0.22.0"`, and `declares` with no tools, no hooks, no routes, no commands, and `client: null`."

**DECISION (owner): the project's "first release" gate is DROPPED.** No git tag and no GitHub release is required
before the gallery entry goes in. Evidence: Pi Pocket's gallery reads only `source.commit` (a 40-hex commit id) and each
file's `sha256` and `size`; `version` is "the author's version, for people"; the gallery never reads a tag or a release.
The repository currently has 0 tags and 0 releases.

This change plans the entry only. It does not edit `index.entries.json`.

## What Changes

- Add one entry object for `git-identity` to `index.entries.json`, as the **second** item in the `extensions` array.
- The `my-example` entry **STAYS** as the worked example. The new entry is **ADDED after it**, not put in its place.
- The object is exact: `pocketApi: 1`, `minPocket: "0.22.0"`, `source.commit`
  `65fea20037191c244ed2d34dcd6bdb39c356e35a`, `files[0].sha256`
  `9d8a4496d7bd912fc256108014ca165572bb0f3b3599e3722d39d9155933731a`, size `22349`, `declares.hooks: []`,
  `declares.access: "owner"`. The full object is in `design.md`.
- **SUPERSESSION**: the deferred task at
  `openspec/changes/archive/2026-10-30-add-git-identity/tasks.md` lines 80-82 is superseded by this change. The archived
  change is **not edited**; the supersession is only recorded here, in `design.md`, and in `tasks.md`.
- **SUPERSESSION**: the tracker issue's "replace the example entry" instruction is superseded too. The `my-example`
  entry stays, and the new entry is added after it.
- No module changes. No breaking changes.

**TRACKER**: GitHub issue #3 tracks this work. Its body is left as it is; do not change it.

## Capabilities

### New Capabilities

None. This change is repository metadata only: it adds an entry to `index.entries.json`. No module, tool, command,
hook, section, wrap, or route changes, so no observable extension behavior changes. The only existing capability,
`git-identity`, keeps every requirement as it is. Following the specs instruction, this change therefore sets
`skip_specs: true` in `.openspec.yaml` and writes no delta spec.

### Modified Capabilities

None. No requirement of `git-identity` changes.

## Impact

- `index.entries.json`: one new object in the `extensions` array. The `my-example` object is untouched, and so are
  `format`, `name`, and `repo`.
- No change to `extensions/git-identity/git-identity.ts`, `scripts/`, `docs/`, or anything in `/app`.
- No change to `openspec/changes/archive/2026-10-30-add-git-identity/`.
- No git tag, no GitHub release, no GitHub write. Issue #3 is read only.
- The finished index must be checked against `/app/src/server/gallery/entry.ts` `parseEntry`: this repository has no
  local validator.
