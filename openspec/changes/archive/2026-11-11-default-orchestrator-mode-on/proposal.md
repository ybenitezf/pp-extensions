# Proposal

## Why

Orchestrator mode is off in every session until a person presses the chip. The person who uses this Pi Pocket wants read-only orchestration, where changes go to subagents, to be the normal way to work. So a session that stores no mode state must enter that mode without a manual step.

## What Changes

- A session with no stored mode state is in orchestrator mode. The default comes from the read path, not from a written row.
- A stored `on: false` is an explicit off. It survives reloads and a restart of the server, and it applies to that session only.
- The first press of the chip in a session with no stored state writes the off state. The document initial value becomes `on: true`, so 1 press makes 1 commit with the correct value.
- Subagent conversations never enter the mode. A child keeps the tools that its parent granted, including `write`, `edit`, and `bash`.
- A fork starts in the mode, because a fork takes the document initial value.
- No owner setting. The default stays a code change in the module.
- **BREAKING** for this Pi Pocket: every session that stores no state enters the mode at once, including sessions that work now. A session with a stored off stays off. A person who wants a session without the mode presses the chip 1 time.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `orchestrator-mode`: the default state of the mode, the first toggle of a session with no stored state, and the exemption of subagent conversations.

## Impact

- `extensions/orchestrator-mode/orchestrator-mode.ts`: the document `initial`, 3 read sites (the prompt section, the shared render of the 2 wrapped offers, the tool gate), the `mode/:conversationId` read route, and 1 new `host.on("run.started")` listener behind a check that `host.on` is there.
- `extensions/orchestrator-mode/README.md`: the default and the exemption.
- No change to the browser module `extensions/orchestrator-mode/orchestrator-mode/index.js`, because the read route returns the effective state.
- The drop-in copy needs a new copy of the `.ts` after the edit. Pi Pocket loads it about 300 ms later, and only while the module is on.
- `openspec/specs/orchestrator-mode/spec.md` gets this change's delta at archive time.
- Every session that stores no state enters the mode at the same moment, so other people on this server see the change too.
