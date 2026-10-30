# Tasks

Context for the agent that applies this change, with no conversation history:

- Target file: `index.entries.json` at the repository root of `pp-extensions`. It has `format: 1`, a `name`, a `repo`,
  and an `extensions` array. Today the array holds **one** object, `my-example`.
- **DECISION: the project's "first release" gate is DROPPED.** No git tag and no GitHub release is required before the
  gallery entry goes in. Evidence: Pi Pocket's gallery reads only `source.commit` (a 40-hex commit id) and each file's
  `sha256` and `size`; `version` is "the author's version, for people"; the gallery never reads a tag or a release. The
  repository currently has 0 tags and 0 releases.
- **SUPERSESSION**: `openspec/changes/archive/2026-10-30-add-git-identity/tasks.md` lines 80-82 say "After the first
  release, add the gallery entry to `index.entries.json`…". That task is superseded by this change. **Do NOT edit the
  archived change.** The supersession is recorded here and in `design.md` only.
- **TRACKER**: GitHub issue #3 tracks this work. Its body is left as it is; do not change it. Its "replace the example
  entry" instruction is superseded too: the `my-example` entry **STAYS** as the worked example, and the new entry is
  **ADDED after it**.
- The object is exact. Do not shorten or reformat the 40-hex `commit` or the 64-hex `sha256`, and do not add a field
  that the object does not have (in particular, no `declares.commands`).

## 1. Add the entry

- [x] 1.1 Open `index.entries.json` and add the object below as the **second item** of the `extensions` array, after the
      closing `}` of the `my-example` object. Keep `format`, `name`, `repo`, and the whole `my-example` object as they
      are. Verify: `git diff index.entries.json` shows only added lines, with no removed line and no changed line inside
      the `my-example` object, and `node -e "JSON.parse(require('fs').readFileSync('index.entries.json','utf8'))"`
      prints nothing (the file parses).
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
- [x] 1.2 Do NOT remove `my-example`, and do NOT move it. Verify: `index.entries.json` holds 2 objects in
      `extensions`, the first has `"name": "my-example"`, and its `sha256`
      `cb09c99b8ae2cce7eed3038bffcededda4c5ae054cc9e32b42204101798193ae` and `size` `2711` are unchanged.
- [x] 1.3 Check the values against the module, as `design.md` D4 says: `pocketApi: 1` (the module exports no
      `pocketApi`, and a module with no export counts as version 1), `declares.hooks: []` (no hook handler; its
      `host.on("session.created", ...)` is an app event listener, not a hook handler), `access: "owner"` (no route and
      no browser module), `minPocket: "0.22.0"` (it needs `web.settings`, `host.on`, and `host.notice`, and says so at
      line 27). Verify: `grep -n "pocketApi" extensions/git-identity/git-identity.ts` finds no export and
      `sed -n '27p' extensions/git-identity/git-identity.ts` names `web.settings`, `host.on`, and `host.notice`.

## 2. Validate the index against `parseEntry`

- [x] 2.1 Read `/app/src/server/gallery/entry.ts` `parseEntry` and compare the finished `index.entries.json` against
      it, field by field, because **this repository has no local validator**: required fields present, `commit` 40 hex
      characters, `sha256` 64 hex characters, `size` a positive number, `pocketApi` a number, `minPocket` a string,
      `declares` an object with the keys `parseEntry` reads, `access` one of the values it accepts. If `parseEntry`
      demands `declares.commands`, stop and ask the owner: the object above has no such field. Verify: write down the
      name of every field that `parseEntry` requires and confirm that the new object has each one. **Read `/app` only;
      do not change any file in it.**
- [x] 2.2 Confirm that no tag and no release is part of this work, as the decision above says. Verify: the diff holds
      `index.entries.json` only, with no tag command, no release command, and no change under
      `openspec/changes/archive/` (`git status --short` shows no path under it).

## 3. Commit

- [x] 3.1 Commit the one changed file with a `chore:` message, for example
      `chore: add the git-identity gallery entry`. This change touches no module, so `scripts/check.sh` is not part of
      the work and is not run. Verify: `git show --stat HEAD` lists `index.entries.json` only, and `git log -1
      --format=%s` starts with `chore:`.
- [x] 3.2 Push only the branch that you are on: `git push origin HEAD`. Do not force-push and do not push another
      branch. Verify: `git status -sb` shows the branch level with its upstream.

## Workflow follow-up

- Do not edit `openspec/changes/archive/2026-10-30-add-git-identity/`. Lines 80-82 of its `tasks.md` stay as they are;
  this change supersedes them.
- Do not change GitHub issue #3, and do not comment on it. The `my-example` entry stays as the worked example.
- Do not create a git tag and do not create a GitHub release: the "first release" gate is dropped.
- Archive this change after the project's review requirements are satisfied.
