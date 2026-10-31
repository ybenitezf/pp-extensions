# Tasks

## 1. Confirm what the CLI answers

- [x] 1.1 Run `openspec status --all --json` in a folder that holds 1 active change, and save the answer as
      `extensions/openspec-status/README.md`'s sample; verify the sample has, for each change, the name, the schema,
      the artifact list with a status for each, the apply list, and the task counter. When a field is missing, note it
      and keep the `--change` fallback from `design.md` decision 2.
- [x] 1.2 Run `openspec status --all --json` in a folder with no active change, and in a folder that is no OpenSpec
      project; verify the exit code and the words of each answer are written down in the same README, because the
      module must tell those 3 cases apart.

## 2. The server side of the module

- [x] 2.1 Create `extensions/openspec-status/openspec-status.ts` with the extension name, the feature checks
      (`pocket`-side parts are the client's), and `export default function`; verify `scripts/check.sh` prints exit code
      0 for it.
- [x] 2.2 Add the project-root resolution (session folder, then `git rev-parse --show-toplevel`) with a per-folder
      memory; verify with a session in this repository's root, in a subfolder, and in a folder with no `openspec/`.
- [x] 2.3 Add the command runner: `execFile("openspec", args)` with an argument array, no shell, a 5-second limit for
      the version check and 10 seconds for a reading; verify that a missing command gives "not found" and not a throw,
      by running the module in a folder with `PATH=/usr/bin`.
- [x] 2.4 Add the reading: run `openspec status --all --json` in the project root, parse it into changes with artifacts
      and task counters, read `tasks.md` for the groups (at most 200 groups, 1,000 checkbox lines each), and count
      each group's done and total tasks; verify against a change whose `tasks.md` has 2 groups, one done and one half
      done.
- [x] 2.5 Add `GET status/:source` as a `conversationRoute` with `{ conversation: "source" }`, which answers
      `{ project, changes, at, error }` and uses a 2-second cache keyed by project root; verify with
      `curl -H 'X-Pocket: 1'` on a session that holds a change, and on one that does not.
- [x] 2.6 Add the triggers: `host.on("run.ended")` and a tool hook for a write under `openspec/` or a bash command
      that names `openspec`, debounced 500 ms, each ending in `web.send("changed", { conversationId })`; verify that a
      change to `tasks.md` from Pi sends 1 event, not 10, by watching the server log.

## 3. The browser side of the module

- [x] 3.1 Create `extensions/openspec-status/openspec-status/index.js` with `export const pocketApi = 1`, the
      feature checks for `pocket.status` and `pocket.panel`, and a `pocket.status` item that reads the route once when
      the tab draws; verify with `node --check` and with the item in the app for a session that holds a change.
- [x] 3.2 Make the item show the glance: the change name and `n/m` for 1 change, the count and the summed counter for
      more, the warning tone when the command is not found, and `remove()` when the folder is no project; verify each
      of the 4 states in a session, by hand.
- [x] 3.3 Add `extensions/openspec-status/openspec-status/look.css` and the panel with each change's schema, artifact
      marks, task bar, task groups, "read <n> ago", and a refresh button; verify the marks use `var(--ok)`,
      `var(--muted)`, and `var(--warn)`, and that the panel draws on a phone width.
- [x] 3.4 Add the polling: 30 seconds while the reading changes, growing by 30 seconds to at most 120 seconds while it
      does not, a new reading at once on the `changed` event of this conversation, and none while the tab is hidden;
      verify with 1 change, by editing `tasks.md` from another terminal and watching the counter.
- [x] 3.5 Add the failure states: keep the last reading with the time it was made, mark it stale, and show the
      command's words in the panel; verify by replacing `openspec` on `PATH` with a script that exits 1.

## 4. Install and check in Pi Pocket

- [x] 4.1 Follow Playbook 1 of `.agents/skills/extension-dropin/SKILL.md` to copy the module file and the
      `openspec-status/` folder into `$dropin`; verify with `ls -l` that both are regular entries and not links, and
      that the module shows in Menu → Extensions.
- [x] 4.2 Turn the module on and check the 4 states in 1 session of this repository: 1 active change, no active
      change, not a project, and a failed command; verify by the status item and the panel, and note the result in the
      module's README.
- [x] 4.3 Run `scripts/check.sh` and `node --check` on the client file; verify both print exit code 0.

## 5. Documentation

- [x] 5.1 Write `extensions/openspec-status/README.md`: what the module shows, where it reads, when it reads, what it
      runs on the machine, the 4 states, the sample of the CLI answer from task 1.1, and the 2 limitations (0.26.0 or
      later; the `openspec` command on the machine); verify it names no path outside Pi Pocket's data folder.

## 6. Nice to have: the action buttons

- [x] 6.1 Add the apply and archive buttons to each change in the panel, each inserting its `/skill:...<name>` text;
      verify a tap puts the text in the message box and sends nothing; there is no explore, propose, or verify button.

## Workflow follow-up

- The gallery entry in `index.entries.json` comes after the module is merged: it needs the commit's full id, the size
  and the SHA-256 of each file, and `declares.client` set to the folder.
- The file list in `AGENTS.md` and the steps in `docs/adding-an-extension.md` do not name a module's browser part.
  Update them in their own change, not in this one.
- A test runner for modules would let `tasks.md` parsing and the CLI parser be tested without a browser; that is its
  own change.
