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

### Requirement: Next-wave summary includes the wave script
Before dispatching a wave, the orchestrator MUST show a short summary of that wave. For each step, the summary MUST state the step name, the effective model, and the tools grant. The summary MUST also show the codemode script that will launch the wave, or state that the wave uses a plain spawn call.

#### Scenario: A multi-step wave is shown before dispatch
- **WHEN** the orchestrator shows the next wave before dispatching a wave with 2 or more steps
- **THEN** the summary states each step name, effective model, and tools grant, and shows the codemode script for that wave

#### Scenario: A single-step wave is shown before dispatch
- **WHEN** the orchestrator shows the next wave before dispatching a wave with 1 step
- **THEN** the summary states that step name, effective model, and tools grant, and states that the wave uses a plain spawn call

### Requirement: Recovery after an interrupted wave script
When a wave script is interrupted, the orchestrator MUST check the status of every child named by that script before it retries the script. A restart during a script can leave a partial wave, so the check MUST cover children that started as well as children that did not start.

#### Scenario: A restart interrupts a wave script
- **WHEN** a wave script is interrupted by a restart and the orchestrator plans to retry that script
- **THEN** the orchestrator checks the status of every child named by the script before it retries the script

#### Scenario: Some children of the interrupted script already started
- **WHEN** an interrupted wave script had already spawned some of its children
- **THEN** the orchestrator checks those children and the remaining named children before it retries the script
