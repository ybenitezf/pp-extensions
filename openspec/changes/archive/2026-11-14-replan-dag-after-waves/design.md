# Design

## Context

The orchestrator-mode behavior comes from the ORCHESTRATOR_PROMPT constant in extensions/orchestrator-mode/orchestrator-mode.ts. The module adds the prompt section and gates tool calls; it does not track work-unit completion or DAG state. See proposal.md for the motivation. The current prompt describes dependency planning and reactive replanning, but not a mandatory review after each completed wave.

## Goals / Non-Goals

**Goals:**
- Define a reliable logical-wave boundary and an evidence-based review of all pending work.
- Make changed and unchanged outcomes visible before the next dispatch.
- Keep completed work and the requested scope stable.

**Non-Goals:**
- Add a runtime scheduler, persistent task state, or code that detects when a wave has completed.
- Set or display a concurrent-call limit.

## Decisions

1. **Use a strict logical-wave barrier.** A logical wave is the set of dependency-ready work units selected for execution. The orchestrator waits for every work unit in that wave to return a terminal outcome, then reduces and verifies the results before it reviews or dispatches later work. Track wave membership and outcomes in the current conversation context. Do not add persistent state. This fits the existing prompt-only architecture. A looser barrier could start work from partial evidence and use stale dependencies.
2. **Audit all pending work after every completed wave, then make only evidence-based changes.** Review whether each pending node is still needed, whether its work or acceptance needs change, and whether its dependencies or readiness changed. Treat evidence as material when it affects one of those properties. Preserve completed nodes and their results. State that the remaining DAG is unchanged when no material effect exists. This replaces a trigger-only review with a mandatory audit, while avoiding a full rewrite after every wave.
3. **Show a concise diff and the next wave before dispatch.** For a changed DAG, list added, removed, or changed nodes and edges, the reason, and the next wave. Do not include a concurrent-call count. For an unchanged DAG, state that it is unchanged and identify the next wave. A full restatement of the graph would add noise; a summary without node and edge changes would make plan changes hard to inspect.
4. **Keep the original request as the scope boundary.** Replanning can change how the work reaches the requested outcome, but not the outcome itself. If evidence suggests a scope change, pause and ask the person before dispatch. This keeps useful adaptation separate from unauthorized scope expansion.
5. **Do not add runtime enforcement in this change.** The prompt can direct the orchestrator to maintain a small wave/outcome ledger and apply the barrier. A runtime tracker would require new state and integration with subagent lifecycle events, which is outside this prompt update.

## Risks / Trade-offs

- [A missing or delayed result can hold the next wave] → Keep non-terminal work visible in the wave ledger; never treat silence as completion, and surface the blocker if progress stops.
- [The model may overreact to minor evidence] → Define material evidence by its effect on a pending node's need, work, acceptance, dependencies, or readiness; otherwise report no change.
- [A prompt cannot enforce task state] → Require the orchestrator to record each wave's members and outcomes in conversation context, and to check that all are terminal before proceeding.
- [A revised DAG may obscure completed work] → Preserve completed nodes and their results in the plan; express corrective work as new pending work rather than silently discarding history.

## Migration Plan

No persistent data migration is needed. Implementation changes the local prompt and its OpenSpec specification. Rollback restores the previous prompt text and removes this change's spec delta. The existing extension check and installation procedures remain in force.
