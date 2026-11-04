# Proposal

## Why

The `orchestrator-mode` chip and command can operate on a subagent room, although that room cannot hold the conversation-scoped mode. A command can therefore enable the orchestrator prompt and block tools in a working subagent. The change must keep the mode on the main session and prevent unsafe changes from a subagent transcript.

## What Changes

- Show the composer chip only when the open room is a session that can hold orchestrator mode.
- Hide the chip in a subagent transcript, and restore it with the main session's state when the person returns to that session.
- Make `/orchestrator-mode` refuse to change state in a room that is not a session, and explain why.
- Use a read-only session-membership check for the client. Keep mode reads and writes on the existing conversation routes with their access checks.
- Record exposing room kind to extensions and command availability support as follow-up work, not part of this change.
- Reject a CSS `:has()` workaround because it depends on host DOM structure and cannot prevent the command from changing state.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `orchestrator-mode`: Limit chip and command behavior to sessions that can hold the mode.

## Impact

This changes the `orchestrator-mode` extension client and command behavior, and adds a read-only session-membership route to its server module. It changes the `orchestrator-mode` capability requirements. It does not change Pi Pocket core or the drop-in installation process.
