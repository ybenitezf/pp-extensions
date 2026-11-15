# Design

## Context

The orchestrator-mode module (`extensions/orchestrator-mode/orchestrator-mode.ts`) builds one prompt section, `ORCHESTRATOR_PROMPT`, that a section hook returns only while the mode is on and only for the main conversation. The prompt already carries the delegation rules: read first, never change files, brief limits, wave planning, and model selection. The gate never rewrites `subagent` arguments; the requirement "Unchanged subagent arguments" keeps that rule. See proposal.md - Why.

The change is retrospective: the prompt sentence and the main spec update already exist, `scripts/check.sh` passed after the prompt edit, and the drop-in copy was refreshed with byte equality. No source edit is left. See proposal.md - Impact.

## Goals / Non-Goals

**Goals:**

- Record the prompt rule as a spec requirement with a testable scenario.
- Keep the rule in the prompt text as one sentence next to the other delegation rules.
- Keep this change free of source and main-spec edits.

**Non-Goals:**

- No change to the model-selection rules or the "Unchanged subagent arguments" requirement.
- No change to the gate, the offers, or the block message.
- No new module, tool, or command.

## Decisions

1. **State the rule as an omission, not a prohibition of explicit selection.** The old wording only said that explicit child tool selection was not required, so the orchestrator could still set `tools`. The new wording names the action: leave the argument out. Alternative: keep the old wording and rely on the "Unchanged subagent arguments" requirement. Rejected: that requirement binds the system, not the orchestrator's prompt, so the prompt must say it.

2. **Put the sentence in the first paragraph of `ORCHESTRATOR_PROMPT`.** It sits with "Never change files yourself" and the brief limits, so the orchestrator reads it before any dispatch. Alternative: a separate paragraph near the model rules. Rejected: the rule is about every call, not one planning step.

3. **Modify the existing "Orchestrator mode prompt" requirement instead of adding a new one.** The sentence is part of the prompt contract, and the delta copies the whole requirement block so archive keeps the scenarios. Alternative: an ADDED requirement for the omission. Rejected: two requirements would describe one prompt section.

4. **Record the work as a retrospective change.** The code and main spec changed first; this change carries the record. Tasks that the facts support are marked complete; the rest stay open.

## Risks / Trade-offs

- [The prompt tells the orchestrator to omit `tools`, while the gate never sets it either, so a child inherits the session tools] → This is intended. The "Delegated child tool grant" requirement still lets the orchestrator widen a child's set with an explicit grant when a task needs it; the sentence only removes the routine per-call argument.
- [The main spec was edited before this change existed, so the delta repeats content already in the main spec] → Acceptable for a retrospective record. The MODIFIED block matches the main spec, so archive is a no-op for that block.
- [A future edit could split the prompt rule and the model rules] → The model requirements stay untouched by this change, and the tasks list checks that no other requirement changed.

## Migration Plan

Already done, in this order: prompt edit, `scripts/check.sh` (exit 0), drop-in copy refresh with byte equality, main spec update. Rollback would revert the one prompt sentence and the matching spec lines. No data or API migration.

## Open Questions

None.
