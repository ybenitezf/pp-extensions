# Proposal

## Why

The `orchestrator-mode` extension keeps its prompt section and its tool gate on one toggle. When the mode is off, the TERMS segment disappears with the gate, so an off conversation loses the orchestration rules entirely. The owner wants the rules always present, and the gate alone to follow the toggle.

## What Changes

- `extensions/orchestrator-mode/orchestrator-mode.ts`, section `orchestrator_mode` (function `orchestratorSection`, around line 315): today it returns `ORCHESTRATOR_PROMPT` only when the mode is on, and `undefined` when the mode is off. After the change it always returns a prompt, with a state header:
  - Mode on: a line that says the gate is on, and blocked tools stay blocked.
  - Mode off: a line that says the gate is off, the orchestrator holds write tools, and delegation stays the preferred style, not a necessity.
- The `ORCHESTRATOR_PROMPT` body stays one canonical text for both states. The state header carries the state, so the reader reads the body lines under the header of the active state.
- Only lines whose claims are false with the gate off get an adjustment, and no more.
- The subagent exemption stays: `isSubagentConversation` still returns `undefined`, so a subagent conversation holds no orchestrator section.
- No other behavior changes:
  - the `modeGate` hook blocks only when the mode is on;
  - the tool-list wraps `stripBlockedDeferredTools` and `stripBlockedCodemode` keep following the toggle;
  - the command and the route stay the same;
  - the mode document stays the same.

Out of scope: copying the module into the drop-in folder (a later step through the `extension-dropin` skill), the `modeGate` logic, new tools, and changes to other modules.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `orchestrator-mode`: the prompt section is no longer tied to the toggle. The requirement "Orchestrator mode prompt" changes from "include the section only while the mode is on" to "always include the section, with a state header that names the on or off state". The read-only claim of the section now holds only under the on-state header. The gate requirements, the allowlist, the subagent exemption, and the model and English rules do not change.

## Impact

- Affected code: `extensions/orchestrator-mode/orchestrator-mode.ts` only, in `orchestratorSection` and possibly a few lines of `ORCHESTRATOR_PROMPT`.
- Affected behavior: the prompt of every non-subagent conversation holds the orchestrator section in both states. A conversation with the mode off keeps write tools and reads the rules with the off-state header.
- No change to tools, commands, routes, owner settings, or dependencies.
- A copy of the module must reach the drop-in folder before the effect is visible in Pi Pocket. That copy is a separate step.
