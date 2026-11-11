# Design

## Context

See proposal.md for the motivation. The module `extensions/orchestrator-mode/orchestrator-mode.ts` keeps 1 durable document per conversation, `x.orchestrator-mode.state`, with `scope: "conversation"`, `history: "latest"`, and `fork: "initial"`.

Facts of the host API that shape this design:

- Reads use `snapshot()`, which returns `undefined` for a document that was never written. `initial()` runs only at the first write.
- Subagent conversations are separate conversations. A prompt section and a tool hook get the subagent conversation id, not the session id. Pi Pocket copies only `PlanDoc` into a new child.
- PiP selects 8 core extensions by name, so a drop-in section or hook never runs in PiP.
- A `host.on` listener gets the event data only, and no commit. A module writes documents only from a command, a web route, or a tool call.
- `host.on` is experimental since Pi Pocket 0.22.0, so the module checks that it is there (`typeof host.on === "function"`) and works without it.
- No host member marks a subagent conversation: `ConversationRecord` has only `id`, `parent`, and `owner`, and a tool or a hook does not see the owner of the conversation it runs in.
- `run.started` carries `{ conversationId, session }`, and a subagent run has `conversationId !== session`. `session.created` never comes from a subagent.
- A subagent agent doc holds `instructions` that start with `You are the subagent "`.

## Goals / Non-Goals

**Goals:**

- The mode is on in every session that stores no state, including sessions from earlier versions, without a write.
- A stored off is durable and applies to 1 session.
- A subagent keeps its tools grant and is never filtered.
- The change touches 1 module file and 1 README. The browser module does not change.

**Non-Goals:**

- An owner setting for the default, in Menu to Extensions.
- Any change to the allowlist, the blocked inventory, or the block message.
- A persisted record of which conversations are subagents.
- A change to PiP behavior, which no drop-in reaches.

## Decisions

### D1: The read path carries the default

`isOnByState(state)` returns `state?.on !== false`. The 3 read sites use it: the prompt section, the shared render of the 2 wrapped offers, and the gate. `readMode` returns the same effective value.

Alternatives: write a row when a session is created. Rejected: a `host.on` listener has no commit, and a route that writes on a read has a side effect on GET and a race with the first message.

### D2: `initial` becomes `on: true`

`tx.doc()` builds a row from `initial()` at its first write. With the initial `on` value at `true`, the first press of the chip flips it to `false` and the toggle stays 1 atomic commit.

Alternatives: read `snapshot` before the commit and flip the effective value. Rejected: 2 people who press at the same time can compute the same next value, and the toggle needs 1 more round trip.

### D3: 2 signals decide that a conversation is a subagent

- Primary: a `Set` of conversation ids, filled by `host.on("run.started")` when `conversationId !== session`. It does not depend on a text of Pi Pocket.
- Fallback: the agent `instructions` start with `You are the subagent "`. It needs no state, so it also answers after a restart.

Both are cheap: the section already gets `input.agent`, an `Agent` value that holds `instructions`, and the gate already casts the runtime to reach `agent()`, which answers with the same value. When `host.on` is absent, the `Set` stays empty and the fallback alone answers.

Alternatives: the `Set` alone. Rejected: a restart during a subagent run leaves the child filtered until the next `run.started`. The text alone. Rejected: it depends on a wording that Pi Pocket can change.

### D4: No owner setting in this change

A configurable default makes `initial` dynamic, so the toggle must read before it commits, which is the design that D2 avoids. A later change can add the setting with its own proposal.

### D5: The read route returns the effective state

The browser module compares `on === true` with what the route returns, so the chip shows the truth with no change to `orchestrator-mode/index.js`. That keeps the drop-in copy to 1 file.

Alternatives: change the client. Rejected: 1 more file to copy, and 1 more place for the default to drift.

## Risks / Trade-offs

- Pi Pocket changes the subagent `instructions` text → the fallback stops answering. The `Set` still answers, and a comment names `subagents.ts` as the source of the text. Mitigation: keep both signals, and re-check the text on a Pi Pocket update.
- The server restarts, or the module reloads, while a subagent works → the `Set` is empty. The fallback covers it. Verified by task 3.7, which reloads the module and needs no restart.
- The change applies at once to open sessions → install when no run is in flight, and say the effect to the people who share the server.
- `agent()` is read on every tool call → it is a runtime read of an object already in memory, not a query. If it shows in latency, cache the answer by `taskId`.
- The `Set` grows without bound → cap it at 2000 ids and drop the oldest.
- A session where a person wants the old behavior → 1 press of the chip, and the off state is durable.

## Migration Plan

1. Edit the module and the README.
2. Run `scripts/check.sh` and require exit code 0.
3. Copy the `.ts` into the drop-in folder with the `extension-dropin` skill, playbook 1.
4. Run the 7 live checks in tasks.md group 3 (3.1 to 3.7).
5. Commit as `feat: default orchestrator mode on for every session`.

Rollback: copy the earlier `.ts` into the drop-in folder again, or `git revert` the commit. A stored off row stays valid under the earlier code.
