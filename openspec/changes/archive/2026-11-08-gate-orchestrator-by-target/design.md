# Design

## Context

The gate is a before-tool hook in `extensions/orchestrator-mode/orchestrator-mode.ts`. It runs only while the mode is on, and it decides with `ALLOWED_TOOLS`, `EXPLICITLY_BLOCKED_TOOLS`, and one branch for `background`. The `background` branch blocks only action `start`.

## Goals / Non-Goals

**Goals:**

- State in the spec why `schedule` and `watch_pr` are allowed while `session_schedule`, `session_watch_pr`, and `repo_watch` stay blocked.

**Non-Goals:**

- Change the treatment of any other tool.
- Change how `background` is handled.

## Decisions

### Allow current-conversation scheduling and watch_pr tools

`schedule` and `watch_pr` act only on the current conversation. Their message starts a normal turn in that same conversation. That turn passes the gate again while the mode is on, because the mode state is durable and scoped to the conversation (`extensions/orchestrator-mode/orchestrator-mode.ts`, `OrchestratorModeDoc`, scope `"conversation"`).

`session_schedule`, `session_watch_pr`, and `repo_watch` act on another session or on PiP, so they stay blocked.

### Keep background as the only argument-dependent exception

`background` with action `start` runs a shell command, so it stays blocked. This is the only exception that depends on an argument.

## Risks / Trade-offs

- `schedule` accepts repeats, so it can spend tokens with nobody watching. The person sees the schedules and can cancel them.
- If the person turns the mode off before a message fires, that message runs as an ordinary turn. This is the person's own choice.
