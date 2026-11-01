# Tasks

## 1. The rule of the buttons in the panel

- [x] 1.1 Add 1 function to `extensions/openspec-status/openspec-status/index.js` that answers, for 1 change of the
  reading, which buttons it gets and the muted line: no button with `nothing to act on yet` when no artifact is `done`
  and `tasks.total` is 0; archive only with `no tasks yet` when every artifact that `change.apply` names is not `done`,
  which is the case with no `tasks.md`; archive only with `all tasks done` when `tasks.total > 0` and
  `tasks.done === tasks.total`; both with no line otherwise; verify with `node --check` and with the 4 states of the
  spec delta written as a short table in the README of task 3.1
- [x] 1.2 Make `ChangeRow` draw the buttons of the function of 1.1 instead of the 2 buttons that it always draws: apply
  only when the answer keeps it, archive only when the answer keeps it, and neither when it keeps neither; verify in Pi
  Pocket, in the 4 states of 1.1, that the row shows the buttons the table names
- [x] 1.3 Draw the muted line in the place of the buttons when the answer has one, and no line when it has none;
  verify each of the 3 lines in the app, by hand, and that a row with both buttons shows no line

## 2. The look of the row

- [x] 2.1 Add the class of the muted line to `extensions/openspec-status/openspec-status/look.css`, in the words
  `var(--muted)` and the size of the panel's other small words; verify the line is not the `small muted` class of the
  panel's top bar, and that the row keeps its height on a phone width when a line takes the place of 2 buttons
- [x] 2.2 Verify that the row with no button and the row with archive only both read as 1 row of the panel: no empty
  space where the buttons were, and no text that a person reads as a fault

## 3. The words of the module

- [x] 3.1 Write the table of the 4 states in `extensions/openspec-status/README.md`: the state, the buttons, and the
  line, from the spec delta of this change; verify that every line of the table names a state that the module can read
  from `changes[]` of the route, and no state that needs a new field
- [x] 3.2 Change the section "The action buttons" of the same README, which says that each change gives exactly 2
  buttons, into the rule of the 4 states; verify that no sentence of the section states that apply is always there

## 4. The checks before the commit

- [x] 4.1 Run `node --check extensions/openspec-status/openspec-status/index.js`; verify exit code 0
- [x] 4.2 Run `scripts/check.sh`; verify exit code 0
- [x] 4.3 Run `openspec validate gate-the-change-actions --strict`; verify exit code 0
- [x] 4.4 Copy the module into the drop-in folder with `.agents/skills/extension-dropin/SKILL.md`, and check the 4
  states in 1 session of this repository: a change with open tasks, a change whose tasks are all checked, a change with
  1 artifact done and no `tasks.md`, and 1 empty change; verify the buttons and the line of each, and note the result
  in the README of task 3.2

## Workflow follow-up

- `design.md` is deliberately skipped: the change touches 1 function of 1 browser module, adds no dependency, and
  the rule of the 4 states is already decided in `specs/openspec-status/spec.md`, so the design document's own
  condition does not apply. No file records this skip; the CLI has no marker for it, so the status of this change shows
  `design` as `ready` until the change is archived.
- Archive this change after the checks of group 4, so that `openspec/specs/openspec-status/spec.md` takes the 2
  modified requirements and the 1 added requirement.
- The gallery entry in `index.entries.json` is not part of this change: the module is already there, and its file
  sizes and hashes change in its own update.
- A test runner for the browser part would let the function of 1.1 be checked without a browser; that is its own
  change.
