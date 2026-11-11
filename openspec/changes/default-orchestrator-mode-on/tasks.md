# Tasks

## 1. Mode default in the module

- [x] 1.1 Change `OrchestratorModeDoc.initial` to `on: true` in `extensions/orchestrator-mode/orchestrator-mode.ts`. Verify: `grep -n "on: true, by" extensions/orchestrator-mode/orchestrator-mode.ts` shows the new initial value.
- [x] 1.2 Add `isOnByState()` and `isSubagent()`, the `run.started` listener behind a `typeof host.on === "function"` check with `web.onDispose`, and the 2000 id cap. Change `_host` to `host`. Verify: `grep -c "on === true" extensions/orchestrator-mode/orchestrator-mode.ts` prints 0, and `grep -n "isOnByState(" extensions/orchestrator-mode/orchestrator-mode.ts` shows the definition and 4 call sites.
- [x] 1.3 Use the effective state at the 3 read sites (the prompt section, the shared render of the 2 wrapped offers, the gate) and skip each one for a subagent conversation. Verify: the type check of task 2.1 prints exit code 0.
- [x] 1.4 Return the effective state from the `mode/:conversationId` read route. This route does not skip a subagent conversation. Verify: the chip reads On in a session with no stored state, in task 3.2.
- [x] 1.5 Write the default rule and the subagent exemption in `extensions/orchestrator-mode/README.md`. Verify: the file names both rules, and a read of the diff shows 1 paragraph each.

## 2. Checks

- [x] 2.1 Run `scripts/check.sh`. Verify: it prints exit code 0, and the built-in tool inventory comparison reports the 2 name counts.
- [x] 2.2 Read `git diff --stat extensions/orchestrator-mode`. Verify: 1 `.ts` file and 1 `README.md` change, and no change to `orchestrator-mode/index.js`.

## 3. Install and live verification

- [x] 3.1 Copy `extensions/orchestrator-mode/orchestrator-mode.ts` into the drop-in folder with the `extension-dropin` skill, playbook 1. Verify: the module is on in Menu to Extensions, and the drop-in holds the new file.
- [x] 3.2 Open a session that nobody touched, and 1 session that existed before the install. Verify: each chip reads On, and a `bash` call is blocked with the mode message.
- [x] 3.3 Start a subagent with `bash` and `write` in its tools grant, and ask it to write a file in `/tmp`. Verify: the child writes the file and reports no block. This proves the exemption.
- [x] 3.4 Press the chip to turn the mode off, reload the page, and fork the session. Verify: a `bash` call runs while off, the off state survives the reload, and the fork's chip reads On.
- [x] 3.5 Ask the owner to restart the server from Menu to Restart server, with no tool call in flight. Verify: a session with a stored off is still off, and a new session starts in the mode.
- [x] 3.6 Ask PiP a question that needs a tool. Verify: PiP answers, and its prompt holds no orchestrator section.
- [x] 3.7 Start a subagent with `bash` in its tools grant and a brief that takes several minutes. Copy `extensions/orchestrator-mode/orchestrator-mode.ts` into the drop-in folder again while it works: the module reloads in about 300 ms, and the new version starts with an empty `Set`. Verify: the subagent's next tool call proceeds, so the fallback alone answers when the `Set` is empty. No restart of the server is needed.

## 4. Integration

- [x] 4.1 Use 2 sessions at the same time, 1 with a stored off and 1 with no stored state. Verify: each chip shows its own state, the off session runs `bash`, and the other session blocks it.

## Workflow follow-up

- Commit as `feat: default orchestrator mode on for every session`.
- Archive the change after the install, the checks, and the live verification pass.
