# Tasks

## 1. Edit the prompt rules

- [x] 1.1 Confirm that the only code file to change is `extensions/orchestrator-mode/orchestrator-mode.ts`, and that `ORCHESTRATOR_PROMPT` holds the 4 numbered blocks BEFORE WORK, DURING A WAVE, AFTER A WAVE, and ON FAILURE. Verify that `grep -n "const ORCHESTRATOR_PROMPT" extensions/orchestrator-mode/orchestrator-mode.ts` prints 1 line and that the 4 block names are present.
- [x] 1.2 Replace the wording of rule 36 in `ORCHESTRATOR_PROMPT`, and add the subrules 36.1 to 36.4: rule 36 states that a wave with 2 or more steps MUST be 1 codemode script that spawns every child of that wave; rule 36.1 states that a wave with 1 step stays a plain spawn call and sends no wave script; rule 36.2 states that each spawn call in the script MUST be awaited and that the script MUST NOT wait for terminal outcomes; rule 36.3 states that each spawn sets its own tools argument under the same rules as any other spawn; rule 36.4 states that the dependency graph and the wave order stay as prose in conversation context. Verify that rules 37 to 71 keep their numbers and that no gate, tool, setting, or state code changes.
- [x] 1.3 Replace the wording of rule 50 in `ORCHESTRATOR_PROMPT`: the next-wave summary MUST state each step name, effective model, and tools grant, MUST show the codemode script that will launch the wave or state that a plain spawn call is used, and MUST end with the sentence that the `code` passed to `codemode` MUST be the same script shown in the summary. Verify that the new rule 50 names all 4 items, keeps the rule against a concurrent-call count, and keeps rule 51 unchanged.
- [x] 1.4 Replace rule 71 in the ON FAILURE block of `ORCHESTRATOR_PROMPT`: if a wave script ends with a partial wave, check the status of every child named by that script before you retry the script; a partial wave can come from an interruption, a guard block, a tool error, or any other abort; the check covers the children that started and the children that did not start. Verify rules 64 to 70 are unchanged, rule 71 sits after rule 70, and no later rule is renumbered.

## 2. Check coverage and module health

- [x] 2.1 Review the final `ORCHESTRATOR_PROMPT` against every scenario in `openspec/changes/archive/2026-11-24-orchestrator-mode-wave-scripts/specs/orchestrator-mode/spec.md`. Verify that the prompt covers the multi-step script, the 1-step spawn, the awaited spawn calls, the script that ends without waiting, the summary fields, the equality of the shown script and the executed script, and the status check after a partial wave. Also verify that each spawned child keeps its explicit task grant and guard check, and that terminal-outcome waiting stays with the orchestrator. Fix any gap in the same code file before continuing.
- [x] 2.2 Run `scripts/check.sh` and verify that it prints exit code 0.

## 3. Copy the module and commit

- [x] 3.1 Copy the edited module into the Pi Pocket drop-in folder by Playbook 1 of `.agents/skills/extension-dropin/SKILL.md`. Set `dropin="${PI_POCKET_DIR:-$HOME/.pi-pocket}/extensions"`, run the skill ownership test and follow its stop or continue rule, use a copy and never a link, and do not copy `README.md` or a test file. Verify a final ownership test exits 0 and `ls -l "$dropin/orchestrator-mode.ts"` shows a regular file. Do not claim that the module runs while it is off; the owner turns it on in Menu → Extensions.
- [x] 3.2 Commit the 1 repository change in 1 commit with a `feat:` or `fix:` message with a short what. Verify `git log -1 --oneline` shows that message, `git status --short` shows no uncommitted change to the module, and no copy in the drop-in folder is staged.

## 4. Follow-up edit: subrules, script equality, and partial wave

- [x] 4.1 Replace rule 36 with rule 36 and the subrules 36.1 to 36.4 in `ORCHESTRATOR_PROMPT`, and keep every later rule number unchanged.
- [x] 4.2 Add the sentence that the `code` passed to `codemode` MUST be the same script shown in the summary at the end of rule 50.
- [x] 4.3 Replace rule 71 with the partial-wave wording, so that any partial wave leads to a status check of every child named by the script before a retry.
- [x] 4.4 Update the delta spec and `openspec/specs/orchestrator-mode/spec.md`: the next-wave summary merges into the existing "Show the revised plan before dispatch" requirement through a MODIFIED Requirements section, the delta holds no duplicate ADDED summary requirement, and the recovery requirement covers any partial wave. Update `proposal.md` and `design.md` in this archive to the same wording.
- [x] 4.5 Run `scripts/check.sh` and `openspec validate --all`, and verify that both print exit code 0.
- [x] 4.6 Copy the edited module into the Pi Pocket drop-in folder again by Playbook 1 of `.agents/skills/extension-dropin/SKILL.md`, and verify that the ownership test exits 0.
