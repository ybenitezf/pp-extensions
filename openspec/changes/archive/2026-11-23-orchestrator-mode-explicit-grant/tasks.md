# Tasks

## 1. Edit the module

- [x] 1.1 In `extensions/orchestrator-mode/orchestrator-mode.ts`, add a block-message builder for an unnamed spawn grant (states that such a spawn gives the child the default tool set including `write`, `edit`, and `bash`, and directs the caller to set `tools` to a non-empty list of exact tool names) and the `modeGate` branch that blocks a `subagent` call with action `spawn` and `tools` missing or an empty array while the mode is on and the caller is not a subagent conversation, leaving `send`, `stop`, and `status` untouched; verify `scripts/check.sh` prints exit code 0
- [x] 1.2 Add to `ORCHESTRATOR_PROMPT` one sentence that directs the caller to always include `codemode` in the `tools` grant of every spawn, placed with the existing grant sentence; verify `scripts/check.sh` prints exit code 0

## 2. Install and verify live

- [x] 2.1 Copy the edited module into the Pi Pocket drop-in folder by the steps in `.agents/skills/extension-dropin/SKILL.md`; verify the copy is a real file, not a link, and Pi Pocket loads it
- [x] 2.2 While orchestrator mode is on in the owner's session, spawn one child with the `tools` argument omitted and confirm the gate blocks the call with the unnamed-grant message, then spawn one child with a non-empty grant and confirm the call passes; verify both outcomes are observable in the conversation

## 3. Commit

- [x] 3.1 Commit the module change as 1 commit with a message in the form `fix: ...`; verify `git log` shows exactly 1 commit touching `extensions/orchestrator-mode/orchestrator-mode.ts` for this change
