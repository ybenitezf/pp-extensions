# Design

## Context

The current verifier instruction is in `ORCHESTRATOR_PROMPT` in `extensions/orchestrator-mode/orchestrator-mode.ts`. It triggers only when the orchestrator cannot repeat a child's test or command result and says never to verify a verifier. See `proposal.md` for motivation.

## Goals / Non-Goals

**Goals:**

- Make verifier dispatch use a model different from the child model.
- Prefer a different provider when the owner's allowlist permits that choice.
- Keep verification active with one allowed model, and disclose the weaker check.
- Keep the trigger and no-recursion rule unchanged.
- Make the verifier brief clean-room by excluding the child's claimed result.

**Non-Goals:**

- No change to general child model selection or the owner allowlist.
- No change to which test or command claims trigger verification.
- No change to retry handling or other orchestration behavior.

## Decisions

- **Use an explicit different-model rule in the prompt.** The verifier instruction will require a model other than the child's model and will tell the orchestrator to prefer a different provider when more than one allowed model is available. This keeps model choice with the orchestrator and preserves the existing subagent argument behavior. A module-side rewrite was rejected because the extension does not own subagent model validation or allowlist selection.
- **Use the only model when necessary.** If the allowlist has one model, the orchestrator will still dispatch the verifier on it and state the limitation in the dispatch line, such as `verifier on <model> (only allowed model)`. Skipping verification was rejected because the claimed result still needs an independent execution check.
- **Use a clean-room brief.** The verifier receives the task and the checking method, but not the child's claimed result. This avoids leading the verifier toward confirmation. Passing the claim was rejected.
- **Preserve the existing boundaries.** The current unrepeatable test-or-command trigger and `never verify a verifier` rule remain explicit.

## Risks / Trade-offs

- [Risk] A single-model verifier is not independent at the model level. → Disclose the weaker check in the dispatch line while still obtaining a fresh execution result.
- [Risk] The prompt may not cause a different-provider choice when several models share a provider. → State provider preference separately from the mandatory different-model rule.
