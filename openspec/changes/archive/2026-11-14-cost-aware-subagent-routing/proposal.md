# Proposal

## Why

Orchestrator mode delegates work to subagents, but the policy for choosing a subagent model is not documented. This change captures the confirmed policy so that dispatch prefers the lowest-cost capable model and only escalates when the task justifies it.

## What Changes

- Update the `orchestrator_mode` prompt section to direct the orchestrator to prefer the lowest-cost owner-allowed model that can handle the delegated task.
- Direct the orchestrator to select a higher-cost model only when the task gives a clear, task-based reason.
- Direct the orchestrator to treat missing price data as unknown, not as cheap, and select such a model only when its capabilities justify the uncertainty.
- Add pre-dispatch reporting: before each dispatch, the visible DAG/wave plan lists the effective `provider/modelId` for each subagent step, identifies the inherited session model when `model` is omitted, and includes a brief task-specific capability reason for any higher-cost or unknown-price choice.
- This is a prompt/model-routing policy change. It does not add a UI selector or change the built-in `subagent` tool arguments.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `orchestrator-mode`: Add a requirement that the orchestrator-mode prompt directs cost-aware subagent model selection. The orchestrator must prefer the lowest-cost owner-allowed model capable of the task, escalate only with a task-based reason, and treat missing price data as unknown. The visible DAG/wave plan lists the effective `provider/modelId` per subagent step before dispatch, names the inherited session model when `model` is omitted, and gives a brief task-specific capability reason for higher-cost or unknown-price choices.

## Impact

- The `orchestrator-mode` prompt text and the model-routing behavior of the orchestrator when it delegates to subagents, including the pre-dispatch DAG/wave plan reporting of each subagent step's effective `provider/modelId`, the inherited session model when `model` is omitted, and brief task-specific capability reasons for higher-cost or unknown-price choices.
- No changes to the UI, the `subagent` tool contract, or the owner's model allowlist.
