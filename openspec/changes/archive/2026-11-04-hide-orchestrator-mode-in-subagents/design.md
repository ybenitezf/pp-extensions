# Design

## Context

See `proposal.md` for the motivation. The extension client has the active conversation id but cannot read its room kind. A subagent id is not a session id. Existing mode routes require session-level access, so they cannot safely identify a subagent room. The updated behavior is in `specs/orchestrator-mode/spec.md`.

## Goals / Non-Goals

**Goals:**

- Identify whether the active room is one of the current person's sessions.
- Keep mode reads and writes on their existing protected conversation routes.
- Prevent the command from changing state for a subagent room.

**Non-Goals:**

- Change Pi Pocket core to expose room kind or command availability to extensions. Record both as follow-up work.
- Use CSS `:has()` to hide the chip. It relies on host DOM structure and cannot protect the command.

## Decisions

### Check session membership without exposing session data

Add `GET session/:id` as a plain route with `{ access: "view" }`. Return only `{ session: request.sessions().some((entry) => entry.id === Number(id)) }`. The route checks the current person's session list and reveals no session details. A subagent id is absent from that list.

Use this read-only check in the client when the active room changes. If it returns `false`, remove the composer chip and record that it is absent. If it returns `true` and the chip is absent, create it again with the existing id, then sync mode from the existing `mode/:conversationId` route. Do not sync mode for a non-session room. Ignore a membership response if the active room changed while the request was pending.

### Keep mutation authorization on the existing conversation route

Keep `GET` and `POST mode/:conversationId` as conversation routes. They carry `requireSee` and `requireSteer`. Do not move a mode mutation to the plain route, because a plain route does not enforce those checks.

Make `/orchestrator-mode` check that the target room is a session before it toggles. If it is not, leave all state unchanged and tell the person that orchestrator mode applies to the main session.

### Reject presentation-only hiding

Do not use a CSS `:has()` workaround. It depends on host DOM details, and it cannot stop the command from writing state for a subagent.

### Let the command learn session membership from the route

A command handler receives no session list or room kind. Its inputs are only `user`, `conversationId`, `cwd`, `signal`, `snapshot`, `context`, and `commit`. Therefore, the `session/:id` route records in memory, under the person's id, the session ids that person could see during that call. The command refuses a room unless its id is in that set. A subagent id never appears in a session list, so this guard cannot allow a subagent. The cache can be cold and refuse a real session. The browser module calls the route on every room change, warming the cache before command use. Exposing room kind to commands remains follow-up work.

## Risks / Trade-offs

- [Membership lookup can fail or return after a room change] → Do not show or sync the chip from a failed request. Ignore responses for a room that is no longer active.
- [A plain route might appear to expose room information] → Return only the membership boolean for the current person's own session list; make no changes through this route.
- [The extension still cannot identify room kind directly] → Keep this check local to the extension and track core room-kind and command-availability APIs as follow-up work.
- [The command guard depends on an in-memory cache] → A cold cache refuses a session; the client's membership check on each room change warms it.

## Migration Plan

No data migration is needed. Deploy the extension update. To roll back, restore the prior extension version; session state remains in the existing conversation documents.
