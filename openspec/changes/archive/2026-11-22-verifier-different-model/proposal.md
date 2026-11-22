# Proposal

## Why

An independent verifier can repeat a child's claimed test or command result with the same model, so it does not provide a sufficiently independent check. The orchestrator must use a different allowed model, while still checking results when only one model is available.

## What Changes

- Require an independent verifier to use a model different from the child model.
- Prefer a verifier from a different provider when the allowlist permits it.
- Fall back to the only allowed model with explicit weaker-check disclosure.
- Keep the current trigger, use a clean-room verifier brief, and never verify a verifier.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `orchestrator-mode`: Define model selection, provider preference, single-model disclosure, and clean-room briefing for independent verification.

## Impact

- `extensions/orchestrator-mode/orchestrator-mode.ts`: update the orchestrator prompt behavior.
- `openspec/specs/orchestrator-mode/spec.md`: add requirements and scenarios for independent verification.
- No API, dependency, or data-model change.
