# Tasks

## 1. Pre-code verification

- [x] 1.1 Have one independent verifier confirm the 34-tool roster and the built-in `subagent` parameter schema against source; record the roster and schema evidence, including conditional `model` and omitted-`tools` behavior.
- [x] 1.2 Verify whether a nested tool call from `codemode` re-enters `beforeTool`; record the result, keep `codemode` only if it re-enters, and otherwise remove it from the allowlist before release. This is a release blocker.
- [x] 1.3 Verify that `defineDoc`, `section`, `hook`, `pocket.composerButton`, and `web.command` behave as these artifacts assume; confirm that the module declares no section with a core key and uses only `orchestrator_mode`; resolve any mismatch before module code.
- [x] 1.4 Confirm that a child conversation has no `orchestrator-mode` document and that the gate does not apply to it. The design is falsified if the child has or receives that document, or if the gate applies to a child tool call.

## 2. Module implementation

- [x] 2.1 Read `docs/adding-an-extension.md` and the relevant Pi Pocket extension API documentation, then write `extensions/orchestrator-mode/orchestrator-mode.ts`, `extensions/orchestrator-mode/README.md`, and the browser part `extensions/orchestrator-mode/orchestrator-mode/index.js` that registers the composer chip and the toggle route through `web.client("orchestrator-mode")`; verify the module declares no tool and exports no `pocketApi = 2`.
- [x] 2.2 Run `scripts/check.sh` and require exit code 0; fix any type-check errors before installation.
- [x] 2.3 Use one `shield` icon in both states, no badge, and a stylesheet scoped to this module's composer button that gives it the built-in Plan chip's border, pill shape, and on-state tint.

## 3. Drop-in installation and manual validation

- [x] 3.1 Read and follow `.agents/skills/extension-dropin/SKILL.md` to copy the module and its browser part folder `extensions/orchestrator-mode/orchestrator-mode/` into the drop-in folder; verify that the installed module and the browser entry `index.js` are copies, not links.
- [x] 3.2 Manually verify toggle on and toggle off from the composer chip and from `/orchestrator-mode`, that the chip keeps one icon in both states, that the state is visible without hover, and that the chip's on-state is visually distinct with the same border and tint as the built-in Plan chip; verify reload survival, blocked `write`, an explicit `model` reaching the child unchanged, and a child receiving a wider tool grant; verify the `codemode` outcome from 1.2 before release. Also verify that the brief is in Simplified Technical English and the orchestrator's final answer to the person is in normal English.
- [x] 3.3 Run `scripts/check.sh` and require exit code 0, then commit the module folder `extensions/orchestrator-mode/` with the message `feat: add orchestrator-mode`.

## 4. Prompt extension beyond the spec minimum

- [x] 4.1 Extend `ORCHESTRATOR_PROMPT` (`extensions/orchestrator-mode/orchestrator-mode.ts:99-105`) from 260 measured characters in 1 paragraph to 1632 measured characters in 4 paragraphs, and cover 17 of the 24 applicable-missing rules of the upstream source; evidence `verification.md` "Verification evidence — tasks 4.1 to 4.4".
- [x] 4.2 Change the block message to "Delegate the work to a subagent." at `extensions/orchestrator-mode/orchestrator-mode.ts:166`, because the hook also blocks `browser` and `ask_someone`, which are not blocked because of a change; evidence `verification.md` "Verification evidence — tasks 4.1 to 4.4".
- [x] 4.3 Correct `design.md`: the roster is 34 = 31 Pi built-ins plus 3 drop-in tools, the enabled inventory is 32, the `codemode` tool-call blocker is closed, and the no-tool-call write question stays open; evidence `verification.md` "Verification evidence — tasks 4.1 to 4.4", item 4.
- [x] 4.4 Record the evidence in `verification.md`: the upstream commit, the before and after size, the 35-row classification, the 17 covered / 7 declined / 9 not-applicable split, the declined reasons, the spec-minimum statement, the reported `check.sh` result, and the open `codemode` question.

## Workflow follow-up

- On owner request for a release, update `index.entries.json` according to `docs/adding-an-extension.md`.
