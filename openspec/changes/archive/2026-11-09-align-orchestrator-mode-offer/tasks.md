# Tasks

## 1. One rule for the gate and the offers

- [x] 1.1 Add a predicate that answers whether the gate blocks a tool name, with the order of the gate: the explicitly blocked set, then background allowed, then the allowlist, then built-in names fail closed. Verify by reading it against the 3 tool sets: every name of the blocked set answers blocked, background answers allowed, every name of the allowlist answers allowed, and no other built-in name answers allowed.
- [x] 1.2 Use the predicate in the beforeTool hook, and keep the read-only annotation check for a tool that is not built in. Verify that scripts/check.sh prints exit code 0, and that the hook still returns no decision while the mode is off.

## 2. The block message

- [x] 2.1 Add one message builder that names the tool, states that the mode offers read-only tools only, and states that a subagent can receive the tool in its tools grant. Verify by reading the produced text: it has the 3 parts, and it no longer holds the sentence that gives the delegation instruction alone.
- [x] 2.2 Return the message of 2.1 from the gate for every blocked call, including background with action start. Verify that scripts/check.sh prints exit code 0, and that every block return of the hook reads the message builder.

## 3. The deferred offer

- [x] 3.1 Add the strip helper for the bullet shape: a hyphen, the tool name, and a colon. It removes only a line whose tool name the predicate blocks, and it keeps every other line. Verify that scripts/check.sh prints exit code 0, and that a read of the helper shows the text unchanged when no name matches.
- [x] 3.2 Add the section wrapper for the deferred tools section. It renders the inner section, returns that text while the mode is off, applies the helper while the mode is on, and returns undefined when no text remains. Verify that scripts/check.sh prints exit code 0, and that the state read uses the document reader of the render input.
- [x] 3.3 Register the wrapper of 3.2 in the extension. Verify that scripts/check.sh prints exit code 0, and that the extension returns the wrapper in its section list.

## 4. The script offer

- [x] 4.1 Add the strip helper for the block shape, two hashes and a tool name up to the next such block, and for the trailing names sentence of the codemode offer. Verify that scripts/check.sh prints exit code 0, and that a read of the helper shows an unknown shape returns its text unchanged.
- [x] 4.2 Add the section wrapper for the codemode section with the same helper and the same state read. Verify that scripts/check.sh prints exit code 0, and that the wrapper returns undefined when every listed tool is blocked.

## 5. The prompt rule

- [x] 5.1 Add 1 sentence to the prompt text of the mode: it offers read-only tools only, and a step that needs another tool goes into the tools grant of a subagent. Verify that scripts/check.sh prints exit code 0, and that the sentence appears in the section text only while the mode is on.

## 6. Install and check by hand

- [x] 6.1 Copy the module into the drop-in folder with the extension-dropin skill. Verify that the copy exists at the drop-in path and that its bytes equal the module in this repository.
- [x] 6.2 With the mode on, read the prompt of a conversation and confirm that both offers hide browser, design_export, design_system, ask_someone, bash, write, edit, secret_request, and secret_save, and that they keep background, design_preview, schedule, watch_pr, and subagent.
- [x] 6.3 With the mode on, make a blocked call, and make a blocked call from a codemode script. Verify that both answer with the message of 2.1, and that the script fails with an error that holds that message.
- [x] 6.4 With the mode on, start 1 subagent that receives a blocked tool in its tools grant. Verify that the subagent can call that tool.
- [x] 6.5 Repeat 6.2 and 6.3 with codemode in its on setting, and with the mode off. Verify that the offers keep the text of the source sections while the mode is off, and that an allowed call proceeds in both settings.

## Workflow follow-up

- Commit the module and the change folder as 1 commit, with the message form of this repository: fix: stop orchestrator mode from advertising blocked tools.
- Archive the change after the manual checks of group 6 pass.
