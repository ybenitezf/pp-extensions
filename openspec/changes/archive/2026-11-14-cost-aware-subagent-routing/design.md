# Design

## Context

Orchestrator mode uses the `ORCHESTRATOR_PROMPT` constant in `extensions/orchestrator-mode/orchestrator-mode.ts` to tell the orchestrator how to delegate. The prompt already directs the orchestrator to read and delegate, but it does not include a model-cost policy. The owner allowlist and per-model price facts are available in `/app/src/server/model-facts.ts`, which exposes separate per-million input and output prices only when they are known. The built-in `subagent` tool validates the chosen `model` against the owner's allowlist, and the module leaves the `subagent` arguments unchanged. See `proposal.md` for motivation and scope.

## Goals / Non-Goals

**Goals:**
- Add a cost-aware model-routing policy to the orchestrator prompt.
- Direct the orchestrator to prefer the lowest-cost owner-allowed model that is capable of the delegated task.
- Permit a higher-cost model only when the task gives a task-specific capability reason.
- Treat a model with unknown price as unknown, not as cheap, and select it only when its capabilities justify the uncertainty.
- Keep the policy inside the prompt so model selection remains the orchestrator's choice.
- Have the orchestrator report the effective `provider/modelId` for each subagent spawn in the existing visible DAG/wave plan before dispatch.
- Have the plan identify the effective current-session model for a spawn with omitted `model`, and give a brief task-specific capability reason for any higher-cost or unknown-price choice.

**Non-Goals:**
- No new UI. Reporting of planned subagent models and the brief cost-exception reasons appear in the existing visible DAG/wave plan.
- No change to the built-in `subagent` tool contract or its `model`, `tools`, `thinking`, or `followUp` arguments.
- No change to the owner's model allowlist.
- No new code-level routing, formula, or enforcement beyond the prompt text.

## Decisions

### Implement the policy as a prompt-only change to `ORCHESTRATOR_PROMPT`
- **Rationale:** The orchestrator already chooses the `model` argument for `subagent` calls. A prompt instruction is the lightest way to change that choice without altering the tool contract or adding routing code.
- **Alternative considered:** Add code that selects the model from `model-facts.ts`. Rejected because `proposal.md` defines this as a prompt/model-routing policy only, and the module must keep `subagent` arguments unchanged.

### Use existing owner-allowed model facts from `/app/src/server/model-facts.ts`
- **Rationale:** The orchestrator can read the model facts, and reusing them avoids duplicating price data in the extension.
- **Cost comparison:** The prompt directs the orchestrator to compare known input and output prices in light of the expected task. A task that produces a large output makes output price more important; a task that consumes a large prompt makes input price more important. No single formula is prescribed, because the cost data does not always establish one cheapest model for every task shape.

### Treat unknown price as unknown, not as cheap
- **Rationale:** `model-facts.ts` exposes prices only when they are known. A missing price is not evidence of low cost, so the policy must not prefer an unknown-price model for cost reasons.
- **Selection rule:** The orchestrator may choose an unknown-price model only when a task-specific capability need justifies the uncertainty.

### Keep higher-cost justification task-specific
- **Rationale:** A generic claim such as "better quality" does not justify a higher cost. The reason must name a concrete capability the task needs, such as a larger context window, a specific coding skill, or multi-language support. The plan shows this same brief reason next to the reported model.

### Report the effective model of each spawn in the existing DAG/wave plan
- **Decision:** Before dispatch, the orchestrator writes the visible DAG/wave plan as it does today, and the plan lists the effective `provider/modelId` for every subagent spawn. The plan is the only reporting surface; no new UI or report format is added.
- **Inherited model:** When a spawn omits `model`, the effective model is the current session's model. The plan must identify that effective current-session model for the spawn, so a reader can see the real model even though the spawn passes no `model` argument.
- **Cost exceptions:** For each listed model that costs more than a cheaper capable owner-allowed model, or whose price is unknown, the plan includes one brief task-specific capability reason. Simple spawns with a lowest-cost capable model need no reason.
- **Rationale:** Reporting before dispatch lets the owner see the effective model and any cost-exception reason before work starts, and it reuses a surface the orchestrator already produces.
- **Trade-off:** The plan becomes slightly longer, and the orchestrator must resolve the effective model for omitted `model` arguments before writing the plan.

## Risks / Trade-offs

- **[Risk]** The orchestrator may write the plan without resolving the effective model for spawns that omit `model`, so the plan shows a placeholder instead of the real model.
  - **Mitigation:** The prompt directs the orchestrator to name the effective current-session model for every such spawn in the plan.

- **[Risk]** The orchestrator may prefer a model whose price is unknown because it assumes missing price means low price.
  - **Mitigation:** The prompt explicitly states that unknown price is unknown, not cheap.
- **[Risk]** The orchestrator may declare a model cheapest without comparing both input and output prices against the task.
  - **Mitigation:** The prompt directs comparison of known prices in light of the expected task.
- **[Risk]** The orchestrator may try to select a model outside the owner's allowlist.
  - **Mitigation:** The prompt limits choices to owner-allowed models and forbids inventing unallowed alternatives.

## Open Questions

None.
