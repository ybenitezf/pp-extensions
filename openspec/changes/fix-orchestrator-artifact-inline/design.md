# Design

## Context

The gate in `extensions/orchestrator-mode/orchestrator-mode.ts` filters tool calls with three sets: `ALLOWED_TOOLS` (pass), `EXPLICITLY_BLOCKED_TOOLS` (block by name), and `BUILT_IN_TOOL_NAMES` (any built-in not allowed is blocked, fail closed). pi-pocket 0.28.0 removed the `artifact_inline` tool, but the host keeps the name in its `BUILT_IN_TOOLS` set as reserved for old sessions (`/app/src/server/reload.ts:126`), and rewrites stored legacy calls to `artifact` with `inline: true` (`/app/src/server/extensions/artifacts.ts`). See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Stop the allowlist from permitting the dead name `artifact_inline`.
- Keep `BUILT_IN_TOOL_NAMES` identical to the host's `BUILT_IN_TOOLS` (issue #17 checks that alignment).
- Record the spec change as a delta; the main spec changes only with the sync flow.

**Non-Goals:**
- Fix issues #15, #16, #17.
- Touch the archived change specs; they are historical records.
- Change the gate for any tool other than `artifact_inline`.

## Decisions

1. Remove `artifact_inline` from `ALLOWED_TOOLS` only, keep it in `BUILT_IN_TOOL_NAMES`.
   - Why: `BUILT_IN_TOOL_NAMES` mirrors the host set, and the host still lists the name. Removing it there would desync the two sets. Keeping it in `ALLOWED_TOOLS` would let the gate pass a call that the host can never run.
   - Alternative considered: remove it from both sets. Rejected: it breaks the host alignment that issue #17 depends on.
2. The gate blocks `artifact_inline` with the delegation message; the host never sees the call.
   - Why: both outcomes fail closed. The gate message tells the orchestrator what to do instead.
3. The main spec is updated by the delta in this change plus the OpenSpec sync flow, never by a direct edit.
   - Why: the project rule keeps `openspec/specs/` under the flow. Sync and archive stay out of the tracked task list; they are workflow follow-up bullets.

## Risks / Trade-offs

- [Old sessions stored calls to `artifact_inline`] -> Those calls live in the host and are rewritten by the host; the gate only filters new calls, so nothing breaks.
- [Drop-in copy goes stale after the edit] -> Reinstall with the extension-dropin skill and compare both copies with `diff`.
- [`scripts/check.sh` exits 2 because of a pre-existing `_template` error] -> Judge the task by the `orchestrator-mode.ts` line, which must say exit code 0.
