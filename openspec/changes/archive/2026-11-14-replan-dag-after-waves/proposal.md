# Proposal

## Why

The local orchestrator prompt can re-plan when a step fails, contradicts an assumption, or reveals required work. It does not require a review after every completed wave. New evidence can therefore leave pending tasks or dependencies based on a stale plan.

## What Changes

- Require a strict logical-wave barrier: collect each work unit's outcome, then reduce and verify the wave before the next wave starts.
- Require an evidence-based review of the remaining DAG after every completed wave. Preserve completed work and the original request. Revise pending work only when evidence materially affects it; otherwise state that the DAG is unchanged.
- Before dispatching the next wave, show a concise diff of added, removed, or changed nodes and edges, the reason for the change, and the next wave. Do not include a concurrent-call count. Ask the person before changing the requested scope.
- Update the local orchestrator-mode prompt and its behavior specification.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- orchestrator-mode: require an evidence-based DAG review at every completed logical-wave boundary.

## Impact

The prompt in extensions/orchestrator-mode/orchestrator-mode.ts and the orchestrator-mode OpenSpec capability will change. No runtime wave tracker or scheduler is in scope.
