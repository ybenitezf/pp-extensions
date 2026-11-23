# Proposal

## Why

The `ORCHESTRATOR_PROMPT` constant in `extensions/orchestrator-mode/orchestrator-mode.ts` costs about 1,360
estimated tokens (characters / 4) in each orchestrator session. A de-duplication analysis found 70 distinct rules
and 6 repeats in its text. A rewrite in a CNL-P-style profile gives about 1,257 estimated tokens, a reduction of
about 7.6 percent, with no rule lost. The prompt is loaded in every orchestrator session, so its length costs
tokens in every such session.

## What Changes

- The text of the `ORCHESTRATOR_PROMPT` constant only. Nothing else in the module changes.
- The applied text is the `## REWRITE` section of `rewrite-text.md` in this change folder, without the
  `Style: ...` label line, which is a drafting note. The body is 5,027 characters as measured here.
- The style is a CNL-P-style profile: a `TERMS` block, then numbered steps in 4 phases (BEFORE WORK,
  DURING A WAVE, AFTER A WAVE, ON FAILURE). The CNL-P specification was not supplied, so this profile is a
  stand-in for it. Do not present it as the CNL-P standard.
- Structure is kept: the plan is a graph of steps with dependencies, execution goes in waves, and the
  orchestrator audits and re-plans after each wave.
- Acceptance criteria:
  1. A coverage audit maps each of the 70 original rules to a step or a `TERMS` entry of the applied text, or
     names it as a conscious removal.
  2. The applied body is 5,100 characters or less.
  3. `scripts/check.sh` exits 0.
  4. A smoke test in a fresh session passes: the orchestrator plans a step graph, sends waves, audits and
     re-plans after each wave, shows the next wave, and reports no count of concurrent calls.
  5. The module is copied again into the drop-in folder with the `extension-dropin` skill.

## Capabilities

### New Capabilities

None. This change introduces no capability.

### Modified Capabilities

None. No requirement changes. The existing `openspec/specs/orchestrator-mode/spec.md` already states the
required content of the prompt (requirement "Orchestrator mode prompt"), and the rewrite keeps every rule that
requirement and the related requirements state. The change therefore sets `skip_specs: true` in its
`.openspec.yaml`, and its task list checks the applied text against the existing spec instead of changing it.

## Impact

- `extensions/orchestrator-mode/orchestrator-mode.ts`: 1 constant, `ORCHESTRATOR_PROMPT`.
- The orchestrator-mode prompt section that every orchestrator session reads: its text and its length only.
- The drop-in copy `extensions/orchestrator-mode/orchestrator-mode.ts` in Pi Pocket's data folder needs a new
  copy, because a module reaches Pi Pocket only as a copy.
- No tool name, command name, extension API version, dependency, or stored state changes.

Out of scope: the other two rewrite styles; a new spec capability for orchestrator mode; any change to module
code.
