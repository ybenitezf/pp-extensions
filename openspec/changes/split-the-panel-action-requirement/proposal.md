# Proposal

## Why

`openspec validate --all` warns about 1 requirement of `openspec-status`: "The panel offers the change's next action as a
message" holds 102 words in 1 paragraph, above the 500-character limit. A reader cannot see which part is the rule and
which part is the reason. The main spec is already synced, so the text changes through this change and not by an edit of
`openspec/specs/openspec-status/spec.md`.

## What Changes

- The requirement keeps its name and its rule: each change gets exactly 2 buttons, apply and archive, and each button
  puts its skill command into the message box and sends nothing. The reason moves out of the paragraph.
- 1 requirement is added for the things the panel must not offer: an explore command, a propose command, or a `verify`
  command for a change. It carries the 1-sentence reason that explore is a mode of the whole session and that propose
  starts a new change.
- The 2 scenarios of the first requirement stay as they are, and the new requirement gets the scenario that names the
  buttons that do not exist.

No behavior changes. The module `openspec-status` already does exactly this: `openspec-status/index.js` calls
`pocket.insertText` for the apply and archive buttons only.

## Capabilities

### Modified Capabilities

- `openspec-status`: 1 requirement is shortened to its rule, and 1 requirement is added for the actions that the panel
  does not offer. The other 5 requirements do not change.

### New Capabilities

None.

## Impact

- Changed: `openspec/specs/openspec-status/spec.md`, after this change is archived.
- No code changes: the module already behaves as the 2 requirements say.
- `openspec validate --all` loses its only warning.
