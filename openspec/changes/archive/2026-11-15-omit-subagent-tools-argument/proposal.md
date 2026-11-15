# Proposal

## Why

The orchestrator prompt only told the orchestrator that explicit child tool selection was not required. That rule stayed too weak: the orchestrator could still set the `tools` argument on a `subagent` call. The prompt now tells the orchestrator to leave the argument out, and the spec must record that behavior. This change is a retrospective record of work that is already in the code and in the main spec.

## What Changes

- The orchestrator-mode prompt section directs the orchestrator to omit the `tools` argument from every `subagent` call.
- The prompt-section scenario now checks that omission, instead of the old rule that did not mandate explicit child tool selection.
- The model-selection rules do not change. The prompt still states file-change permission and allowed paths in every brief.
- **BREAKING**: none. The change only tightens prompt wording.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `orchestrator-mode`: the "Orchestrator mode prompt" requirement now directs the orchestrator to omit the `tools` argument from every `subagent` call, and its scenario checks that omission.

## Impact

- `extensions/orchestrator-mode/orchestrator-mode.ts`: the `ORCHESTRATOR_PROMPT` text holds the new sentence. Already edited; `scripts/check.sh` passed after the edit; the drop-in copy was updated and byte equality was verified.
- `openspec/specs/orchestrator-mode/spec.md`: already updated directly with the new requirement sentence and scenario.
- No other module, API, or dependency changes. No source code change is left for this change.
