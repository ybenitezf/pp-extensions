# Spec Delta

## ADDED Requirements

### Requirement: Wave dispatch as a codemode script
While orchestrator mode is on, the orchestrator MUST dispatch a wave with 2 or more steps as 1 codemode script that spawns every child of that wave. A wave with 1 step MUST stay a plain spawn call. The dependency graph and wave order MUST remain prose in conversation context. A wave script MUST NOT wait for the terminal outcome of a child, because spawn returns at once and the script ends.

#### Scenario: A wave holds 2 or more steps
- **WHEN** the orchestrator dispatches a wave that holds 2 or more steps
- **THEN** it sends 1 codemode script that spawns every child of that wave

#### Scenario: A wave holds 1 step
- **WHEN** the orchestrator dispatches a wave that holds exactly 1 step
- **THEN** it uses a plain spawn call and sends no wave script

#### Scenario: The wave script ends
- **WHEN** a wave script has made its spawn calls
- **THEN** the script ends without waiting for terminal outcomes, and the dependency graph and wave order stay in prose

### Requirement: Recovery after a partial wave
When a wave script ends with a partial wave, the orchestrator MUST check the status of every child named by that script before it retries the script. A partial wave can come from an interruption, a guard block, a tool error, or any other abort. The check MUST cover the children that started as well as the children that did not start.

#### Scenario: A wave script ends with a partial wave
- **WHEN** a wave script ends with a partial wave and the orchestrator plans to retry that script
- **THEN** the orchestrator checks the status of every child named by the script before it retries the script

#### Scenario: Some children of the partial wave already started
- **WHEN** a wave script that ended with a partial wave had already spawned some of its children
- **THEN** the orchestrator checks those children and the remaining named children before it retries the script

## MODIFIED Requirements

### Requirement: Show the revised plan before dispatch
When an audit changes the pending DAG, the orchestrator MUST recompute the remaining wave order from the revised nodes and dependencies. Before dispatching the next wave, it MUST show a concise diff of added, removed, or changed nodes and edges, the reason, and the next wave. The diff MUST NOT include a concurrent-call count. The next-wave summary MUST state, for each step, the step name, the effective model, and the tools grant. It MUST also show the codemode script that will launch the wave, or state that the wave uses a plain spawn call. The `code` passed to `codemode` MUST be the same script shown in the summary.

#### Scenario: The audit changes the pending DAG
- **WHEN** the audit changes a pending node or dependency
- **THEN** the orchestrator recomputes future wave order and shows the diff, reason, and next wave before dispatch

#### Scenario: The audit leaves the DAG unchanged
- **WHEN** the audit finds no material change
- **THEN** the orchestrator states that the DAG is unchanged and shows the next wave without a concurrent-call count

#### Scenario: A multi-step wave is shown before dispatch
- **WHEN** the orchestrator shows the next wave before dispatching a wave with 2 or more steps
- **THEN** the summary states each step name, effective model, and tools grant, and shows the codemode script for that wave

#### Scenario: A single-step wave is shown before dispatch
- **WHEN** the orchestrator shows the next wave before dispatching a wave with 1 step
- **THEN** the summary states that step name, effective model, and tools grant, and states that the wave uses a plain spawn call

#### Scenario: The executed script matches the shown script
- **WHEN** the orchestrator passes the wave script to `codemode`
- **THEN** the `code` it passes is the same script that the summary showed
