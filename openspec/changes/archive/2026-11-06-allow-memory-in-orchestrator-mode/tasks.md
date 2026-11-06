# Tasks

## 1. Allow the memory tool while the mode is on

- [x] 1.1 In `extensions/orchestrator-mode/orchestrator-mode.ts`, add `"memory"` to `ALLOWED_TOOLS` and verify the file compiles with `scripts/check.sh` (exit code 0).
- [x] 1.2 Remove `"memory"` from `EXPLICITLY_BLOCKED_TOOLS`, leave every other entry and the hook's check order untouched, and verify `scripts/check.sh` still exits 0.
- [x] 1.3 Confirm `"memory"` stays in `BUILT_IN_TOOL_NAMES` and verify with a read of the file that the set contents still match the design (no removal).

## 2. Verify behavior at tool-call time

- [x] 2.1 With orchestrator mode on in a test session, call `memory` and verify the call is not blocked by the mode gate and the separate `memory` extension applies its approval flow to the write.
- [x] 2.2 With orchestrator mode on, re-check the other state-changing tools (`approvals`, `ask_someone`, `secret_request`, `secret_save`, `design_export`, `design_system`) and verify each call is still blocked.
- [x] 2.3 Copy the edited module into the Pi Pocket drop-in folder with the extension-dropin skill, turn the module off and on if needed, and verify the loaded copy blocks `write`, `edit`, and `bash` as before.

## Workflow follow-up

- Archive the change with the openspec archive workflow after review.
- Verify the archived spec then shows `memory` as allowed while the mode is on.
