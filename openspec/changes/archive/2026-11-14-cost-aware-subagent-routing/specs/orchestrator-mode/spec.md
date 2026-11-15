# Spec Delta

## ADDED Requirements

### Requirement: Cost-aware subagent model selection
While orchestrator mode is on, the orchestrator-mode prompt section MUST direct the orchestrator to prefer the lowest-cost owner-allowed model capable of a delegated task. It MUST select a higher-cost model only for a task-specific capability reason. It MUST treat unknown price as unknown, not cheap, and choose such a model only when its capabilities justify the uncertainty. It MUST NOT select outside the owner's allowlist or invent a cheaper alternative when none is available.

#### Scenario: Cheaper allowed model fits a simple task
- **WHEN** the orchestrator delegates a simple task and one owner-allowed model has lower known input and output prices than another allowed model for that task
- **THEN** it chooses the lower-priced model

#### Scenario: Higher-cost model chosen for a task-specific capability
- **WHEN** a delegated task needs a capability that only a higher-cost owner-allowed model provides
- **THEN** it chooses that higher-cost model and the reason is the task-specific capability need

#### Scenario: Unknown price is not treated as cheap
- **WHEN** an owner-allowed model has no known price and another allowed model has lower known prices for the expected task
- **THEN** the orchestrator does not choose the unknown-price model solely because it might be cheap

#### Scenario: No selection outside the allowlist
- **WHEN** the cheapest capable model is not in the owner's allowlist
- **THEN** the orchestrator chooses from the allowed models and does not invent an unallowed alternative

### Requirement: Report planned subagent models
The orchestrator-mode prompt section MUST direct the orchestrator to make the visible DAG/wave plan list the effective `provider/modelId` for every subagent spawn before dispatch. When `model` is omitted for a spawn, the plan MUST identify the effective current-session model for it. For any choice of a higher-cost or unknown-price model, the plan MUST include a brief task-specific capability reason.

#### Scenario: Explicit model named before dispatch
- **WHEN** the orchestrator sets `model` on a spawn and writes the DAG/wave plan before dispatch
- **THEN** the plan lists that spawn's effective `provider/modelId`

#### Scenario: Inherited session model identified
- **WHEN** a spawn omits `model`
- **THEN** the plan names the effective current-session model for that spawn

#### Scenario: Higher-cost choice carries its reason
- **WHEN** the plan lists a model that costs more than a cheaper capable allowed model, or has unknown price
- **THEN** the plan includes a brief task-specific capability reason for that choice
