# Design

## Context

See proposal.md for the motivation. The gate lives in the `beforeTool` hook of `extensions/orchestrator-mode/orchestrator-mode.ts`. While the mode is on, the hook checks, in order: `EXPLICITLY_BLOCKED_TOOLS` (block by name), the `background` action check, `ALLOWED_TOOLS` (proceed), `BUILT_IN_TOOL_NAMES` (built-ins fail closed), then non-built-in tools pass only with `readOnlyHint === true`. Today `memory` sits in `EXPLICITLY_BLOCKED_TOOLS`, so it is blocked before the allowed check runs. The separate `memory` extension holds each memory write for the owner's approval outside this hook.

## Goals / Non-Goals

**Goals:**
- Let a `memory` call proceed while orchestrator mode is on.
- Keep every other explicitly blocked tool blocked, with no change to the hook's order or to the fail-closed rule for built-ins.

**Non-Goals:**
- No change to the `memory` extension, its approval flow, or its stored data.
- No change to `BUILT_IN_TOOL_NAMES` or to how the mode advertises tools.
- No change to the orchestrator prompt sections or the read-only annotations path.

## Decisions

- Add `"memory"` to `ALLOWED_TOOLS` and remove it from `EXPLICITLY_BLOCKED_TOOLS`. The two sets are checked by name in a fixed order; a tool must leave the block list or the allowed check never runs. Alternative considered: a special-case branch for `memory` before the block check, like `background` uses. Rejected: the allowed list is the existing mechanism for "always allowed while mode is on", so one entry in each set is the smaller change and keeps `background` as the only special case.
- Keep `"memory"` in `BUILT_IN_TOOL_NAMES`. The allowed check runs before the built-in check, so `memory` matches `ALLOWED_TOOLS` and the fail-closed branch is not reached. If a later edit removes `"memory"` from `ALLOWED_TOOLS`, the built-in check blocks it again, which preserves fail-closed behavior. Alternative considered: removing it from the built-in list too. Rejected: that weakens the fail-closed inventory and the task does not ask for it.
- Update the module comment on `EXPLICITLY_BLOCKED_TOOLS` only if needed to keep it accurate; no behavior text changes.

## Risks / Trade-offs

- [Memory writes could leak state across sessions without the person watching] → The separate `memory` extension holds each write for the owner's approval, so the approval gate is unchanged.
- [A future reorder of the hook checks could re-block or over-allow `memory`] → The design keeps the order untouched; the spec scenario for a `memory` call that proceeds documents the intended order at tool-call time.

## Migration Plan

Single-module edit, no data and no API change. Apply the edit, run `scripts/check.sh`, then copy the module into the drop-in folder per `.agents/skills/extension-dropin/SKILL.md`. Rollback is reverting the two-set edit in the same file.

## Open Questions

None.
