# Proposal

## Why

Pi Pocket has no view of the OpenSpec change that the session's folder holds, so a person must run `openspec status`
in a terminal to know how far a change got. The Pi terminal app has this view: `mattoopie/pi-openspec-status` draws the
active change, the artifact states, and the task progress as a widget above the editor. Pi Pocket runs the same
extension API in a web app, where the equivalent places are a status item under the message box and a panel beside the
conversation. This change adapts that extension to Pi Pocket.

## What Changes

- A new module `openspec-status` reads the OpenSpec project of the session's folder and shows it in the app.
- A **status item** under the message box gives the glance for 1 active change: status mark, change name, task counter.
  With several active changes it gives the count and the summed task counter.
- A **panel** beside the conversation gives the detail: each active change, its schema, its artifact marks, its task
  bar, and its task groups, with the time of the last reading.
- The reading refreshes when Pi ends a run, when Pi writes under `openspec/` or runs a bash command that names
  `openspec`, and from a fallback poll that starts at 30 seconds and grows to 120 seconds while nothing changes.
- A failure keeps the last reading, marked stale, with the reason in the panel. A folder that is not an OpenSpec
  project shows no status item and no panel content.
- **Nice to have, second phase:** buttons on each change that put `/skill:openspec-apply-change <name>` into the
  message box, and the same for archive. `explore` and `propose` are not per-change buttons: `explore` is a
  session-wide mode, and `propose` starts a new change. Pi Pocket has no `verify` skill in this repository, so there is
  no verify button.
- The scope is the session's folder alone: 1 project per tab, never a view across sessions.

## Capabilities

### New Capabilities

- `openspec-status`: how the app shows the OpenSpec change of the session's folder, when it reads, and what it does when
  the folder is not a project or the CLI fails.

### Modified Capabilities

None. No existing requirement changes.

## Impact

- New files: `extensions/openspec-status/openspec-status.ts` and its browser part in `extensions/openspec-status/openspec-status/`,
  plus a `README.md`.
- Uses the app's status line, panel, and `conversationRoute` parts, which are experimental since 0.19.0, and `host.on`,
  experimental since 0.22.0. A Pi Pocket older than 0.26.0 shows no status item and no panel; the module says so in its
  description.
- Runs the `openspec` command on the server with `node:child_process`, in the session's folder. Lancet Guard does not
  see that command, and the module's description says so.
- Requires the `openspec` command on the machine. Without it, the module says "OpenSpec command not found".
- `index.entries.json` gets an entry when the module is published.
