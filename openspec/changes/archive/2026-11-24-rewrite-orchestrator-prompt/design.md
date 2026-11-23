# Design

## Context

See proposal.md - Why for the motivation and the measured numbers.

- The prompt lives in 1 place: the `ORCHESTRATOR_PROMPT` constant of
  `extensions/orchestrator-mode/orchestrator-mode.ts`. The module interpolates nothing into it, so its text is
  plain text.
- The module has no test that reads the prompt text. `scripts/check.sh` type-checks the module only.
- Pi Pocket reads the module only as a copy in its drop-in folder, and loads a new copy about 300 ms later while
  the module is on.
- `openspec/specs/orchestrator-mode/spec.md` already states the required content of the prompt, so this change
  needs no new requirement.
- The reference text is `rewrite-text.md` in this change folder. Its `## COVERAGE` table maps 60 groups of the
  70 original rules to the new steps, and its `## REMOVED` list names the 6 repeats.

## Goals / Non-Goals

**Goals:**
- 1 applied text that holds all 70 original rules, in the CNL-P-style profile.
- A measured body of 5,100 characters or fewer.
- An audit that a reviewer can repeat from `rewrite-text.md` alone.

**Non-Goals:**
- Change any module code, tool name, command, or stored state.
- Change a spec requirement.
- Apply either of the other 2 rewrite styles.

## Decisions

- **Copy the `## REWRITE` section as written, without the `Style: ...` line.** The label is a drafting note,
  and it costs tokens in every session. Alternative: keep the label to record the stand-in in the prompt. Rejected,
  because the section header of the change and the proposal already record it.
- **Keep the 4-phase order and the `TERMS` block.** Numbered steps give a citable rule, so the coverage audit
  can name a step number for each original rule. Alternative: prose paragraphs, as in the original. Rejected,
  because a rewrite in prose makes the audit a judgement call.
- **Keep the graph, wave, and audit structure.** The person asked for the plan as a graph of steps with
  dependencies, execution in waves, and an audit and re-plan after each wave. The profile changes the wording, not
  that structure.
- **Verify coverage by the table, not by opinion.** Run the `## COVERAGE` mapping again against the applied text.
  A rule that no step holds is either added to a step, or listed in `## REMOVED` with the step that holds its
  fact.
- **Measure the body before the commit.** The count excludes the `## REWRITE` heading and the `Style:` line, and
  trims the ends. This is the same measure that gave 5,027 characters.
- **Verify with a smoke test, not a unit test.** No test harness reads the prompt text, and this change adds no
  code, so the check is a fresh session with the 5 listed behaviors plus `scripts/check.sh`.

## Risks / Trade-offs

- A rule is lost in the rewrite → the coverage audit maps each of the 70 rules to a step or a `TERMS` entry, or
  names it as a conscious removal.
- The new text breaks the string literal, for example on a backtick or on `${...}` → search the applied text for
  these 2 sequences before the commit, and run `scripts/check.sh`.
- The body grows past the budget while the text is edited → measure the count after each edit, not only at the
  end.
- A behavior regression shows up only in real use → the smoke test covers plan, waves, audit, next wave, and the
  rule about no count of concurrent calls. If it fails, revert the commit and copy the module again.
- The profile is a stand-in, because the CNL-P specification was not supplied → state the stand-in in the proposal
  and in the summary, and keep the profile as 1 style choice, not as a claim about CNL-P.
