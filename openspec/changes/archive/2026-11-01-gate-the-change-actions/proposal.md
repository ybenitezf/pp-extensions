# Proposal

## Why

Every change in the panel gets an `Apply` button and an `Archive` button, whatever its state. So a change whose tasks
are all checked still offers `Apply`, and an empty change offers 2 actions over nothing to act upon. Both buttons put a
skill command in the message box that has no work to do, and the row looks like it is waiting for a person.

## What Changes

- The panel shows `Apply` only while the change has implementation work: its `tasks` artifact is done, and its task
  counter is not yet all checked.
- The panel shows `Archive` for every change that has been written, and no button at all for a change with nothing
  written yet: no artifact done and no task lines.
- A row that has no button says so in 1 short muted line, so the row does not look broken. A row that keeps only
  `Archive` says why `Apply` is gone: all tasks are checked, or the tasks are not written yet.
- One requirement of the `openspec-status` capability changes from "exactly 2 buttons" to a rule for when each button
  shows.

No breaking change: the 2 commands and their text stay as they are, and the module still sends nothing.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `openspec-status`: requirement "The panel offers the change's next action as a message" now gives the condition of
  each button. Requirement "The panel offers no other action for a change" keeps its rule that no third button exists,
  and gains the rule for a row that has no button.

## Impact

- `extensions/openspec-status/openspec-status/index.js`: `ChangeRow` decides the buttons and draws the muted line.
- `extensions/openspec-status/openspec-status/look.css`: a style for the muted line, if the row needs one.
- `extensions/openspec-status/README.md`: the "action buttons" section, and the notes on what was checked by hand.
- No route, no `openspec-status.ts`, and no change of the reading: the panel already receives everything that the rule
  needs, in `change.artifacts[]`, `change.apply`, and `change.tasks`.
