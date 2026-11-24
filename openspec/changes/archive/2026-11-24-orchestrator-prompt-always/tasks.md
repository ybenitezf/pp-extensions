# Tasks

## 1. State header for the prompt section

- [x] 1.1 In `extensions/orchestrator-mode/orchestrator-mode.ts`, change `orchestratorSection` (around line 315): remove the `isOn` ternary so the function always returns `ORCHESTRATOR_PROMPT` with a state header line in front of it, and keep the `isSubagentConversation` exemption that returns `undefined`. Verify: the function holds no `isOn` branch, and a subagent conversation still gets no section.
- [x] 1.2 Add the 2 state header strings: 1 for the on state, which states that the gate is on and blocked tools stay blocked, and 1 for the off state, which states that the gate is off, that the orchestrator holds write tools, and that delegation stays the preferred style, not a necessity. Verify: each header matches the requirement "Orchestrator mode prompt" in `specs/orchestrator-mode/spec.md`, and the active state selects its own header.
- [x] 1.3 Keep the body below the header as 1 canonical text, and adjust only the body lines whose claims are false while the gate is off, and no more. Verify: the prompt of the 2 states is the same text apart from the header line and those adjusted lines.

## 2. Type check

- [x] 2.1 Run `scripts/check.sh` and verify that it prints exit code 0.

## Workflow follow-up

- Copy the module into the drop-in folder `extensions/` in Pi Pocket's data folder with the skill `.agents/skills/extension-dropin/SKILL.md`. This step is a later step, outside this change, and this change does not do the copy.
