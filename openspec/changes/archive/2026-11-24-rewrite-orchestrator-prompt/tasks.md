# Tasks

## 1. Apply the rewrite and audit it

- [x] 1.1 Replace the text of the `ORCHESTRATOR_PROMPT` constant in
      `extensions/orchestrator-mode/orchestrator-mode.ts` with the `## REWRITE` section of `rewrite-text.md`,
      without the `Style: ...` label line and without the `## COVERAGE` and `## REMOVED` sections. Verify: the
      module holds no `Style:` line; the body measures 5,100 characters or fewer by the count in design.md; the
      applied text holds no backtick and no `${...}` sequence.
- [x] 1.2 Run the coverage audit again against the applied text. Verify: each of the 70 original rules maps to a
      step or a `TERMS` entry of the applied text, or appears in the `## REMOVED` list of `rewrite-text.md`
      with the step that holds its fact. Report the count of mapped rules and the count of conscious removals.

## 2. Checks and installation

- [x] 2.1 Run `scripts/check.sh`. Verify: it prints exit code 0.
- [x] 2.2 Copy the module into the drop-in folder with the `extension-dropin` skill, as a copy and never as a
      link. Verify: the copy `extensions/orchestrator-mode/orchestrator-mode.ts` in Pi Pocket's data folder has
      the new text.
- [x] 2.3 Smoke test in a fresh orchestrator session. Verify all 5 behaviors: the orchestrator plans a step graph;
      it sends the steps in waves; it audits and re-plans after each wave; it shows the next wave before it sends
      it; it reports no count of concurrent calls.

## 3. Spec check and commit

- [x] 3.1 Check the applied text against the existing `orchestrator-mode` spec. Verify: every requirement that
      states prompt content (for example "Orchestrator mode prompt", its tools-grant and brief rules, its failure
      rule, and the Simplified Technical English requirement) holds for the applied text. Sync the spec during
      implementation only when a stated behavior diverges. Record the result either way.
- [x] 3.2 Commit the change as 1 commit, as the repository rules require. Verify: `git show --stat` lists the
      module file and this change folder, the message has the form `fix: <what>`, and the commit is 1 change of 1
      module.
