# Tasks

## 1. Declare and read the owner setting

- [x] 1.1 In `extensions/orchestrator-mode/orchestrator-mode.ts`, update `createOrchestratorMode` to declare exactly one setting with `web.settings`: name `default_on`, a user-facing label, type `boolean`, and default `true`; guard the declaration with the same runtime compatibility pattern as `host.on`, so an older host without the settings API still loads the module. Verify that the declaration is made at most once per module setup and that the no-settings host path does not call a missing method.
- [x] 1.2 In `extensions/orchestrator-mode/orchestrator-mode.ts`, replace `isOnByState` with an effective-state helper that returns stored `state.on` when a stored document exists, otherwise reads `web.setting("default_on")`; guard the accessor and invalid or missing values so the fallback is `true`. Verify that a missing state resolves to `true` by default and to the owner value when the accessor is available, while stored `false` remains `false`.
- [x] 1.3 In `extensions/orchestrator-mode/orchestrator-mode.ts`, thread the effective-state accessor through `orchestratorSection`, `filteredOfferSection`, `readMode`, and `modeGate` (including the deferred-tools and codemode wrappers), and update each existing read to use it. Verify that prompt, offer, route, hook, and chip-serving GET reads all use one stored-state-first path.

## 2. Toggle the effective state

- [x] 2.1 In `extensions/orchestrator-mode/orchestrator-mode.ts`, change `toggleMode` and its callers so the transaction distinguishes an absent conversation document from a stored document, computes the current effective state from `default_on` when absent, and writes its inverse. Verify that the first toggle with `default_on` false writes `on: true`, while the first toggle with `default_on` true writes `on: false`.
- [x] 2.2 In `extensions/orchestrator-mode/orchestrator-mode.ts`, preserve the existing actor and ISO timestamp writes in `toggleMode`, and return the newly stored state through both the POST route and the command. Verify that later toggles invert the stored value and that stored state remains authoritative after reloads and setting changes.

## 3. Preserve browser behavior and verify the contract

- [x] 3.1 Inspect `extensions/orchestrator-mode/orchestrator-mode/index.js` and the `web.conversationRoute("GET", "mode/:conversationId", ...)` registration in `extensions/orchestrator-mode/orchestrator-mode.ts`; make no edit to the chip or browser module, and keep the existing GET route and response shape. Verify that the unchanged chip receives the configured effective state and that one press uses the updated POST behavior.
- [x] 3.2 Verify the scenarios in `openspec/changes/orchestrator-mode-default-setting/specs/orchestrator-mode/spec.md` against the implementation: on/off recording, reload persistence, first press with both defaults, untouched existing sessions, owner changes, stored off, fork with no stored state, setting visibility and default, and the absent-settings-API fallback. Use route/command checks or the repository's available test harness, and record any scenario that cannot be exercised directly.
- [x] 3.3 Review `extensions/orchestrator-mode/orchestrator-mode.ts` for non-goals from `design.md`: do not change the document kind, version, scope, history, fork policy, command name, routes, prompt/tool behavior, stored state shape, chip, or browser part. Verify the diff contains only the settings/effective-state/toggle changes required by this change.

## 4. Repository finishing steps

- [x] 4.1 After implementation edits to `extensions/orchestrator-mode/orchestrator-mode.ts`, run `scripts/check.sh`; require exit code 0 before commit. Verify the command output reports a successful check.
- [x] 4.2 After each edit, use the `extension-dropin` skill to copy `extensions/orchestrator-mode/orchestrator-mode.ts` into Pi Pocket's drop-in folder. Do not copy it by another method or commit the drop-in copy; verify that each edit reaches Pi Pocket only through a new copy.
- [x] 4.3 Commit this one-module change as one commit with a message in the form `feat: <what>` or `fix: <what>`. Verify the commit contains the intended source change and no drop-in copy or unrelated file.
- [x] 4.4 Push only the current branch with `git push origin HEAD`; never push another branch and never force-push. Verify the push reports the current branch as its target.

## 5. Capture the default at first use

- [x] 5.1 In `extensions/orchestrator-mode/orchestrator-mode.ts`, implement the durable capture of `default_on`: on every read path that can write, the conversation GET route and the toggle paths, store the current `default_on` value when the conversation stores no record, and let the sections and the mode gate read the stored document. Keep the stored record shape `{ on, by, at }`, with an empty `by` until a toggle fills it and a capture time in `at`, so every record differs from the document's initial value, and make a later read and a later toggle tell a captured record from a conversation that stores no record. Verify that a captured value survives a restart and that a toggle inverts the captured value, not the current setting.
- [x] 5.2 Verify the scenarios in `openspec/changes/orchestrator-mode-default-setting/specs/orchestrator-mode/spec.md` for the capture: an ongoing session keeps its captured value across a change of `default_on` and across a restart, a conversation that never resolved the mode follows the current setting, a toggle inverts the captured value, and a fork captures at its own first use. Use route or command checks, and record any scenario that cannot be exercised directly.
- [x] 5.3 Run `scripts/check.sh` after the implementation edits; require exit code 0 before the commit. Verify that the command output reports a successful check.
- [x] 5.4 Use the `extension-dropin` skill to copy `extensions/orchestrator-mode/orchestrator-mode.ts` into Pi Pocket's drop-in folder, commit this fix as one commit with a message in the form `fix: <what>`, and push the current branch with `git push origin HEAD`. Do not commit the drop-in copy, do not push another branch, and do not force-push.
