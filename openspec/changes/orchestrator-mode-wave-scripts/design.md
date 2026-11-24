# Design

## Context

The behavior comes from one string constant, `ORCHESTRATOR_PROMPT`, in `extensions/orchestrator-mode/orchestrator-mode.ts`. The section hook returns that string only while orchestrator mode is on and only for the main conversation. Its rules sit in 4 numbered blocks: BEFORE WORK, DURING A WAVE, AFTER A WAVE, and ON FAILURE. Rule 36 says to send one wave in one batch. Rule 50 says to show the next wave before dispatch. Neither names a dispatch mechanism. See `proposal.md` for motivation.

The needed seams already exist. `codemode` is on the orchestrator allowlist. `tools.subagent` spawn works from inside a codemode script, and each spawn inside a script keeps its guard check. No gate change is needed: this is a prompt-section change only. A script cannot await the terminal outcome of a child, because spawn returns at once and the script ends. The dependency graph and wave order therefore stay as prose in conversation context. The existing completion barrier in AFTER A WAVE stays in force.

## Goals / Non-Goals

**Goals:**

- Give the orchestrator one explicit dispatch mechanism for a wave with 2 or more steps.
- Make the next-wave summary show the step facts and the script that will launch the wave.
- Make recovery after an interrupted wave script check every child named by that script.
- Keep the change inside one prompt constant and one module.

**Non-Goals:**

- No gate, tool, setting, state, or API change.
- No runtime tracker, no persistent DAG, and no script that waits for children.
- No change to terminal-outcome waiting, wave audits, verifier rules, or failure retries beyond the interrupted-script rule.

## Decisions

### Change rule 36 and rule 50 in place, and append 1 rule to ON FAILURE

Replace the wording of rule 36 with the multi-step wave script rule and the 1-step plain spawn exception. Replace the wording of rule 50 with the next-wave summary rule: step name, effective model, tools grant, and the launching codemode script. Append rule 71 to ON FAILURE for the interrupted-script check: before a retry, check the status of every child named by the script. Rule numbers stay stable; no later rule moves.

Alternative: add all new rules to DURING A WAVE as new numbered rules and renumber every later rule. Rejected: it makes a large mechanical diff for no behavior gain. A search of the repository found no code, spec, or test that refers to a rule number, so keeping the numbers stable is safe. The 2 existing rules already own the 2 topics, and ON FAILURE is the natural home for the restart check.

### Add 3 ADDED requirements to the existing capability

The spec delta at `specs/orchestrator-mode/spec.md` adds "Wave dispatch as a codemode script", "Next-wave summary includes the wave script", and "Recovery after an interrupted wave script" under ADDED Requirements. It does not alter the existing "Orchestrator mode prompt" requirement.

Alternative: add scenarios under the existing "Orchestrator mode prompt" requirement as a MODIFIED block. Rejected: the instruction for MODIFIED requires the full existing block, and the existing block carries 8 scenarios for other behavior. The new rules are new concerns, so ADDED keeps the archive merge clean and each requirement covers one behavior.

### Leave the completion barrier with the orchestrator, not the script

The wave script ends after its spawn calls. AFTER A WAVE still requires a terminal outcome from every step before a later wave starts. The prompt MUST NOT describe the script as a barrier or tell it to poll child status.

Alternative: make the script wait for children and report outcomes. Rejected: spawn returns at once and the script ends, so such a rule would be false.

## Risks / Trade-offs

- [A model reads the wave script as the completion barrier] → Keep the script-end and prose-DAG statements next to the dispatch rule, and keep the existing AFTER A WAVE rules unchanged.
- [A restart leaves a partial wave] → Keep rule 71; it requires a status check of every named child before the script is retried.
- [A spawn in a script loses its grant or guard check] → No gate change is made; each spawn keeps its explicit task grant and its guard check. Verify this in the prompt review task.
- [The next-wave summary becomes long] → Keep the summary to the named fields and the script text; keep the rule against a concurrent-call count.
- [An edited file never reaches the owner] → Copy the changed module into the drop-in folder by the documented procedure and verify the copy after the edit.

## Migration Plan

No stored state and no API change exist, so no data migration is needed. Edit `extensions/orchestrator-mode/orchestrator-mode.ts`, run `scripts/check.sh` until it prints exit code 0, then copy the module into the drop-in folder by the procedure in `.agents/skills/extension-dropin/SKILL.md`. Commit the repository change once with a `feat:` or `fix:` message. To roll back, revert that commit and copy the previous module into the drop-in folder again by the same procedure.
