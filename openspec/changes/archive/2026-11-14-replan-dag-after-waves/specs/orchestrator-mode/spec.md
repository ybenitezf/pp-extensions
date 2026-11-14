# Spec Delta

## ADDED Requirements

### Requirement: A logical wave is a completion barrier
While orchestrator mode is on, the orchestrator MUST wait for each work unit in the current logical wave to return a terminal outcome. It MUST reduce and verify those outcomes before dispatching a later wave.

#### Scenario: Every work unit returned
- **WHEN** every work unit in the current logical wave has returned a terminal outcome
- **THEN** the orchestrator reduces and verifies the wave outcomes before dispatching the next wave

#### Scenario: A work unit remains active
- **WHEN** any work unit in the current logical wave has not returned a terminal outcome
- **THEN** the orchestrator does not dispatch a later wave

### Requirement: Review the remaining DAG after every wave
After each logical wave is reduced and verified, the orchestrator MUST review every pending work unit and dependency against the wave's evidence. It MUST preserve completed work and the original request. It MUST change pending work only when evidence materially affects it. Otherwise, it MUST state that the remaining DAG is unchanged.

#### Scenario: Evidence does not affect pending work
- **WHEN** the audit finds no material effect on pending work or dependencies
- **THEN** the orchestrator states that the remaining DAG is unchanged and retains the current pending plan

#### Scenario: Evidence affects pending work
- **WHEN** evidence materially changes pending task needs or dependencies
- **THEN** the orchestrator updates only the remaining DAG and preserves completed work and its results

### Requirement: Show the revised plan before dispatch
When an audit changes the pending DAG, the orchestrator MUST recompute the remaining wave order from the revised nodes and dependencies. Before dispatching the next wave, it MUST show a concise diff of added, removed, or changed nodes and edges, the reason, and the next wave. The diff MUST NOT include a concurrent-call count.

#### Scenario: The audit changes the pending DAG
- **WHEN** the audit changes a pending node or dependency
- **THEN** the orchestrator recomputes future wave order and shows the diff, reason, and next wave before dispatch

#### Scenario: The audit leaves the DAG unchanged
- **WHEN** the audit finds no material change
- **THEN** the orchestrator states that the DAG is unchanged and shows the next wave without a concurrent-call count

### Requirement: Replanning preserves the requested scope
The orchestrator MUST use replanning only to fulfill the original request. If a candidate update would alter or expand the requested scope, it MUST pause and ask the person before dispatching that work.

#### Scenario: A re-plan preserves scope
- **WHEN** the audit changes task decomposition without changing the requested outcome
- **THEN** the orchestrator may update the pending DAG without changing scope

#### Scenario: A re-plan would change scope
- **WHEN** a candidate update would alter or expand the requested outcome
- **THEN** the orchestrator does not dispatch the changed work and asks the person for a decision
