# Tasks

## 1. Edit the prompt rules

- [x] 1.1 Confirm that the only code file to change is `extensions/orchestrator-mode/orchestrator-mode.ts`, and that `ORCHESTRATOR_PROMPT` holds the 4 numbered blocks BEFORE WORK, DURING A WAVE, AFTER A WAVE, and ON FAILURE. Verify that `grep -n "const ORCHESTRATOR_PROMPT" extensions/orchestrator-mode/orchestrator-mode.ts` prints 1 line and that the 4 block names are present.
- [x] 1.2 Replace the wording of rule 36 in `ORCHESTRATOR_PROMPT`: a wave with 2 or more steps MUST be 1 codemode script that spawns every child of that wave; a wave with 1 step stays a plain spawn call; the script ends after its spawn calls; the DAG and wave order stay in prose. Verify the new rule 36 states all 4 points and that no gate, tool, setting, or state code changes.
- [x] 1.3 Replace the wording of rule 50 in `ORCHESTRATOR_PROMPT`: the next-wave summary MUST state each step name, effective model, and tools grant, and MUST show the codemode script that will launch the wave, or state that a plain spawn call is used. Verify the new rule 50 names all 4 items and keeps the rule against a concurrent-call count.
- [x] 1.4 Append rule 71 to the ON FAILURE block of `ORCHESTRATOR_PROMPT`: after an interrupted wave script, check the status of every child named by that script before retrying the script. Verify rules 64 to 70 are unchanged, rule 71 sits after rule 70, and no later rule is renumbered.

## 2. Check coverage and module health

- [x] 2.1 Review the final `ORCHESTRATOR_PROMPT` against every scenario in `openspec/changes/orchestrator-mode-wave-scripts/specs/orchestrator-mode/spec.md`. Verify the prompt covers the multi-step script, the 1-step spawn, the script that ends without waiting, the summary fields, and the status check after an interrupted script. Also verify that each spawned child keeps its explicit task grant and guard check, and that terminal-outcome waiting stays with the orchestrator. Fix any gap in the same code file before continuing.
- [x] 2.2 Run `scripts/check.sh` and verify that it prints exit code 0.

## 3. Copy the module and commit

- [x] 3.1 Copy the edited module into the Pi Pocket drop-in folder by Playbook 1 of `.agents/skills/extension-dropin/SKILL.md`. Set `dropin="${PI_POCKET_DIR:-$HOME/.pi-pocket}/extensions"`, run the skill ownership test and follow its stop or continue rule, use a copy and never a link, and do not copy `README.md` or a test file. Verify a final ownership test exits 0 and `ls -l "$dropin/orchestrator-mode.ts"` shows a regular file. Do not claim that the module runs while it is off; the owner turns it on in Menu → Extensions.
- [x] 3.2 Commit the 1 repository change in 1 commit with a `feat:` or `fix:` message with a short what. Verify `git log -1 --oneline` shows that message, `git status --short` shows no uncommitted change to the module, and no copy in the drop-in folder is staged.
