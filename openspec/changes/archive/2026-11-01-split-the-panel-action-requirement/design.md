# Design

## The situation

`openspec/specs/openspec-status/spec.md` holds the synced text. A main spec is not edited by hand: this change carries a
delta, and `openspec archive` puts the delta into the main spec.

## The 2 choices

**The requirement keeps its name.** OpenSpec finds the requirement in the main spec by its name. A new name would read as
1 REMOVED requirement and 1 ADDED requirement, and the history of the rule would break in 2.

**The reason goes to a second requirement.** The validator warns about a long requirement, and its advice is to state 1
behavior. The rule about the 2 buttons and the rule about the buttons that do not exist are 2 behaviors: they are 2
requirements now. The sentence that gives the reason for the second rule stays with it, because a reader who asks why the
panel offers no explore button finds the answer in the same place.

## What does not change

The module `extensions/openspec-status/openspec-status/index.js` holds the behavior: `pocket.insertText` for the apply
button and the archive button of each change, and no third button for a change. The panel's own Refresh button is not a
button of a change, so the 2 requirements say nothing about it. No code changes, and `scripts/check.sh` keeps its result.
