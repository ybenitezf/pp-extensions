# Tasks

## 1. Session membership and command guard

- [x] 1.1 Add the read-only `GET session/:id` route. Verify that it returns only `{ session: true }` for a listed session and `{ session: false }` for a subagent or unlisted id.
- [x] 1.2 Guard `/orchestrator-mode` before it changes state. Verify that a non-session target leaves state unchanged and shows the reason, while a session still toggles through the protected mode route.

## 2. Composer chip lifecycle

- [x] 2.1 Check session membership when the open room changes. Remove the chip for non-sessions; recreate it and sync the mode for sessions. Verify that a subagent transcript has no chip and returning to the main session restores its current state.
- [x] 2.2 Handle failed or stale membership responses without showing or syncing a chip for the wrong room. Verify the room-switch behavior and run `scripts/check.sh`; it must exit with code 0.
