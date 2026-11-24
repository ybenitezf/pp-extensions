# Design

## Context

The behavior comes from one string constant, `ORCHESTRATOR_PROMPT`, in `extensions/orchestrator-mode/orchestrator-mode.ts`. The section hook returns that string only while orchestrator mode is on and only for the main conversation. Its rules sit in 4 numbered blocks: BEFORE WORK, DURING A WAVE, AFTER A WAVE, and ON FAILURE. Rule 36 says to send one wave in one batch. Rule 50 says to show the next wave before dispatch. Neither names a dispatch mechanism. See `proposal.md` for motivation.

The needed seams already exist. `codemode` is on the orchestrator allowlist. `tools.subagent` spawn works from inside a codemode script, and each spawn inside a script keeps its guard check. No gate change is needed: this is a prompt-section change only. A script cannot await the terminal outcome of a child, because spawn returns at once and the script ends. The dependency graph and wave order therefore stay as prose in conversation context. The existing completion barrier in AFTER A WAVE stays in force.

## Goals / Non-Goals

**Goals:**

- Give the orchestrator one explicit dispatch mechanism for a wave with 2 or more steps.
- Make the next-wave summary show the step facts and the script that will launch the wave.
- Make the script and the summary use the same text.
- Make recovery after a wave script that ends with a partial wave check every child named by that script.
- Keep the change inside one prompt constant and one module.

**Non-Goals:**

- No gate, tool, setting, state, or API change.
- No runtime tracker, no persistent DAG, and no script that waits for children.
- No change to terminal-outcome waiting, wave audits, verifier rules, or failure retries beyond the partial-wave rule.

## Decisions

### Change rule 36 in place with subrules 36.1 to 36.4, change rule 50 in place, and replace rule 71

Replace the wording of rule 36 with the multi-step wave script rule. Then add the subrules 36.1 to 36.4 in the same block: 36.1 states that a wave with 1 step stays a plain spawn call and sends no wave script, 36.2 states that each spawn call in the script MUST be awaited and that the script MUST NOT wait for terminal outcomes, 36.3 states that each spawn sets its own tools argument under the same rules as any other spawn, and 36.4 states that the dependency graph and the wave order stay as prose in conversation context. The subrules keep the number of the main rule and leave every later number unchanged.

Replace the wording of rule 50 with the next-wave summary rule: step name, effective model, tools grant, and the launching codemode script. Rule 50 ends with the sentence that the `code` passed to `codemode` MUST be the same script shown in the summary, so the script that runs is the script that the person saw.

Replace rule 71 with the partial-wave rule: if a wave script ends with a partial wave, check the status of every child named by that script before you retry the script. A partial wave can come from an interruption, a guard block, a tool error, or any other abort. The check covers the children that started and the children that did not start. Rule numbers stay stable; no later rule moves.

Alternative: add all new rules to DURING A WAVE as new numbered rules and renumber every later rule. Rejected: it makes a large mechanical diff for no behavior gain. A search of the repository found no code, spec, or test that refers to a rule number, so keeping the numbers stable is safe. The 2 existing rules already own the 2 topics, and ON FAILURE is the natural home for the partial-wave check.

### Add 2 ADDED requirements and 1 MODIFIED requirement to the existing capability

The spec delta at `specs/orchestrator-mode/spec.md` adds "Wave dispatch as a codemode script" and "Recovery after a partial wave" under ADDED Requirements. The next-wave summary does not get its own requirement. The delta holds a MODIFIED Requirements section with the full replacement text of the existing "Show the revised plan before dispatch" requirement. That text holds the diff, the next-wave summary with the step name, the effective model, the tools grant, the script shown, and the rule that the executed script is the shown script. The delta leaves no duplicate ADDED summary requirement.

Alternative: add scenarios under the existing "Orchestrator mode prompt" requirement as a MODIFIED block. Rejected: the instruction for MODIFIED requires the full existing block, and the existing block carries 8 scenarios for other behavior. The new rules are new concerns, so ADDED keeps the archive merge clean and each requirement covers one behavior.

### Leave the completion barrier with the orchestrator, not the script

The wave script ends after its spawn calls. AFTER A WAVE still requires a terminal outcome from every step before a later wave starts. The prompt MUST NOT describe the script as a barrier or tell it to poll child status.

Alternative: make the script wait for children and report outcomes. Rejected: spawn returns at once and the script ends, so such a rule would be false.

## Risks / Trade-offs

- [A model reads the wave script as the completion barrier] → Keep the script-end and prose-DAG statements next to the dispatch rule, and keep the existing AFTER A WAVE rules unchanged.
- [A restart, a guard block, or a tool error leaves a partial wave] → Keep rule 71; it requires a status check of every named child before the script is retried.
- [A spawn in a script loses its grant or guard check] → No gate change is made; each spawn keeps its explicit task grant and its guard check. Rule 36.3 keeps the grant rule next to the script rule. Verify this in the prompt review task.
- [The next-wave summary becomes long] → Keep the summary to the named fields and the script text; keep the rule against a concurrent-call count.
- [The script that runs differs from the script that was shown] → Rule 50 states that the `code` passed to `codemode` MUST be the same script shown in the summary.
- [An edited file never reaches the owner] → Copy the changed module into the drop-in folder by the documented procedure and verify the copy after the edit.

## Migration Plan

No stored state and no API change exist, so no data migration is needed. Edit `extensions/orchestrator-mode/orchestrator-mode.ts`, run `scripts/check.sh` until it prints exit code 0, then copy the module into the drop-in folder by the procedure in `.agents/skills/extension-dropin/SKILL.md`. Commit the repository change once with a `feat:` or `fix:` message. To roll back, revert that commit and copy the previous module into the drop-in folder again by the same procedure.
