# Design

## Context

See `proposal.md` for the motivation and `specs/openspec-status/spec.md` for the requirements.

Facts that shape the approach, all checked on this machine:

- Pi Pocket is 0.26.0. `pocket.status`, `pocket.panel`, `pocket.insertText`, and `pocket.conversationId` are there
  (status and panel are experimental since 0.19.0). `host.on` is there (experimental since 0.22.0).
- A module reaches the drop-in folder as a copy: `<dropin>/<name>.ts` and `<dropin>/<name>/`, per the skill
  `.agents/skills/extension-dropin/SKILL.md`. The browser part must be a folder named after the module, and it serves
  `.js`, `.mjs`, `.css`, `.json`, images, and fonts. It never serves `.ts`.
- `web.client` resolves the entry inside the drop-in folder, and it refuses a link.
- `openspec` 1.15.0 is installed on the machine, and `openspec status --all --json` exists.
- `scripts/check.sh` type-checks only `.ts` files.

## Goals / Non-Goals

**Goals:**

- 1 module, 1 file of TypeScript, plus a browser folder, that a person can read in 1 sitting.
- No reading of any folder that the session does not show.
- No reading while no tab of that session is open, except the reading that a trigger asks for.

**Non-Goals:**

- A view across sessions. The owner decided against it.
- A tool for Pi, a prompt section, or a slash command. Pi runs `openspec` itself when it needs to, and this module is
  for people to look at.
- Writing to any OpenSpec file. The module only reads, and runs `openspec status` and `openspec list`.

## Decisions

**1. Split: `.ts` on the server, `index.js` and `look.css` in `extensions/openspec-status/openspec-status/`.**
The drop-in serves no `.ts`, and the `openspec` command must run in the server process. So the parser, the command
runner, and the route live in the `.ts`, and the browser only draws what a route gives it. Alternative rejected: a
single file that draws, as the upstream extension does, because a browser part cannot be a `.ts`, and a server file
cannot draw.

**2. One CLI call per reading: `openspec status --all --json`.**
Upstream calls `openspec list --json` and then `openspec status --json --change <name>` for every change, and keeps a
fingerprint to skip the second round. With `--all`, 1 call gives every active change with its detail, so the
fingerprint, the coalescing, and the per-change fan-out go away. Fallback if `--all` lacks a field in a row: read that
change with `openspec status --json --change <name>`. Task groups are not in the JSON, so `tasks.md` is read from disk
for each active change that the panel shows.

**3. The reading is made by a route, per conversation, and it is scoped by the server.**
`web.conversationRoute("GET", "status/:source", handler, { conversation: "source" })` gives
`request.conversation.cwd` after the app has checked that the person may see that session. The browser sends only
`pocket.conversationId()` in the path. The browser never sends a folder. Alternative rejected: a plain route with
`?conversation=<id>` and a lookup in `request.sessions()`, which is more code for the same check.

**4. Project root: the session's folder, then the git root.**
`stat(<cwd>/openspec/changes)` first; if that is missing, `git rev-parse --show-toplevel` and the same `stat` there.
The answer is cached per cwd in memory, and forgotten when a reading finds no project (a person can add one later).
Alternative rejected: always the git root, because a session may be in a folder that holds `openspec/` without being a
git repository.

**5. The browser asks; the server never polls by itself.**
The tab reads once when it draws, then every 30 seconds while the tab shows, growing to 120 seconds while the reading
does not change, and at once after a trigger. A trigger is `host.on("run.ended")` or a tool hook that sees a write
under `openspec/` or a bash command whose text has `openspec`; the module then sends `web.send("changed", { conversationId })`,
and each tab re-reads only if that id is its own. Events cannot be addressed to 1 conversation, so the event is a
nudge, and the route is the truth. Alternative rejected: a timer on the server for each session, which reads folders
that nobody looks at.

**6. The server keeps one short-lived cache, keyed by project root.**
2 tabs of the same session, or 2 sessions in the same folder, share 1 reading for 2 seconds. The cache holds the last
good reading and its time, so a failed reading can answer with the previous one and its error, as the spec asks.

**7. Rendering uses the app's own pieces.**
Marks are `var(--ok)` (done), `var(--muted)` (ready), and `var(--warn)` (blocked); the bar is a `div` with a width in
percent; text uses the classes `small`, `mono`, and `button`. No width arithmetic, no ANSI, and no theme argument
threaded through every function, which is most of the upstream renderer.

**8. The status item is removed, not emptied, when there is no project.**
`pocket.status({...})` returns an `Added` with `update` and `remove`. A session whose folder is not an OpenSpec project
has no item, and the panel says so if it is open.

**9. Buttons in a second phase: apply and archive, per change.**
`pocket.insertText("/skill:openspec-apply-change <name>")` is 1 call and no server work, so it is cheap, but the owner
called it a nice-to-have: phase 2 in `tasks.md`. A change keeps only the 2 commands that take its name: apply and
archive. The owner dropped `explore` and `propose`, because neither acts on 1 change: `explore` is a mode of the whole
session, and `propose` starts a new change. Neither takes the change's name, so a button for either is only noise.

**10. One file, with the parser inside it.**
`AGENTS.md` allows 1 `.ts` per module and helpers that start with `_`. The task-group parser is about 40 lines, so it
goes in the module behind a `parseTaskGroups` function, and no `_helper.ts` is needed, which keeps the install to 1 file
plus 1 folder.

## Risks / Trade-offs

- **Experimental APIs can change in a minor release** → feature-detect `pocket.status`, `pocket.panel`, and `host.on`
  before use, and say `minPocket: 0.26.0` in the gallery entry.
- **The JSON of `openspec status --all` may differ from what upstream parses** → check the real output during apply,
  parse fields defensively, fall back to `--change` per row, and add a test with a recorded output.
- **The client is plain JavaScript, and `scripts/check.sh` does not look at it** → `node --check` on `index.js` in the
  check step, plus 1 real load in a browser tab with a change present.
- **The `openspec` command may be missing from the environment of the server process** (systemd PATH, not the shell's)
  → report "not found" with the words that came back, never an empty state.
- **A trigger storm** (Pi writes 10 files under `openspec/`) → the nudge is debounced 500 ms, and the 2-second cache
  absorbs the rest.
- **Lancet Guard does not see the module's `openspec` calls** → the module's description says that it runs the
  `openspec` command read-only, and the gallery review checks the code against the description.
- **A very large `tasks.md`** → count at most 200 groups, and stop counting into a group after 1,000 checkbox lines.

## Migration Plan

None: new module. To roll back, uninstall with Playbook 2 of the skill, which removes `<dropin>/openspec-status.ts` and
`<dropin>/openspec-status/` and leaves the owner's on/off choice in place.

## Addendum: what the CLI answers (from task 1.2)

`openspec status --all --json` was run in 3 folders, on this machine, with `openspec` 1.15.0. Every run exited 0 and
wrote nothing to stderr.

| Case | Exact exit code | `root.source` |
| --- | --- | --- |
| OpenSpec project with 1 active change | `0` | `"nearest"` |
| OpenSpec project with no active change | `0` | `"nearest"` |
| No OpenSpec project | `0` | `"implicit"` |

`root.source === "implicit"` is the signal for "not an OpenSpec project", and the exit code does not serve, because
all 3 cases exit 0 and the 2 empty cases also share an empty `changes` list and the same `message`.

Decision 4 stays the rule for finding the root, and this addendum adds the case signal that decision 4 does not name.
