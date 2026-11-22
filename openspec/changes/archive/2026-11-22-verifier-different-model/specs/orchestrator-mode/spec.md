# Spec Delta

## ADDED Requirements

### Requirement: Independent verifier model selection
The orchestrator MUST run an independent verifier on a model different from the child model. When the owner's allowlist offers more than one model, it MUST prefer a model from a different provider.

#### Scenario: Verifier uses a different model
- **WHEN** a child claims a result that requires independent verification and the allowlist has another model
- **THEN** the orchestrator dispatches the verifier on a model different from the child's model

#### Scenario: Verifier prefers a different provider
- **WHEN** the allowlist has more than one model and at least one allowed model uses a provider different from the child's model
- **THEN** the orchestrator prefers an allowed verifier model from that different provider

### Requirement: Single-model verifier fallback
The orchestrator MUST still spawn an independent verifier when the owner's allowlist contains only one model, and MUST disclose the weaker check in the verifier dispatch line.

#### Scenario: Only one model is allowed
- **WHEN** a child claims a result that requires independent verification and only one model is allowed
- **THEN** the orchestrator runs the verifier on that model and includes a disclosure such as `verifier on <model> (only allowed model)`

### Requirement: Clean-room verifier brief
The independent verifier brief MUST provide the task and how to check it, and MUST NOT provide the child's claimed result.

#### Scenario: Verifier receives an unleading brief
- **WHEN** the orchestrator dispatches an independent verifier for a claimed test or command result
- **THEN** the brief tells the verifier what to run and how to check it without stating or implying the child's claimed outcome

### Requirement: Unrepeatable result verification trigger
The orchestrator MUST spawn one independent verifier only when a child claims a test or command result that the orchestrator cannot repeat itself.

#### Scenario: The orchestrator cannot repeat a claimed result
- **WHEN** a child claims a test or command result that the orchestrator cannot repeat
- **THEN** the orchestrator spawns one independent verifier

#### Scenario: The orchestrator can repeat the result
- **WHEN** a child claims a test or command result that the orchestrator can repeat itself
- **THEN** the orchestrator does not spawn an independent verifier for that claim

### Requirement: Verifiers are not verified
The orchestrator MUST NOT spawn a verifier to verify a verifier's claimed result.

#### Scenario: A verifier reports a result
- **WHEN** an independent verifier claims a test or command result
- **THEN** the orchestrator does not spawn another verifier for that result
