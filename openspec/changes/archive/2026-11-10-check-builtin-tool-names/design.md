# Design

## Context

See `proposal.md` for the motivation. Three constraints shape the approach.

1. The 2 sets are equal today, 31 names each, and the difference is empty in both directions. The guard covers a future edit, and it does not repair a live fault.
2. No public extension API exposes the built-in tool names. `Host` has no tool member, `AppEvents` has 6 session and message events only, and `HookApi` gives a `beforeTool` hook the values `{ name, arguments, parent }` only. `host.toolNames()` is internal (`/app/src/server/host.ts`), it is absent from `_pocket.d.ts`, and a drop-in MUST NOT use internal members. So the copy stays, and a runtime check inside the module cannot compare the 2 sets.
3. This repository has no test runner and no CI: no `package.json`, no `node_modules`, no `*.test.ts` file, no `.github` folder, and `scripts/check.sh` skips `*.test` files. `scripts/check.sh` is the only automated step that runs.

The drift has 2 directions, and they are not equal in effect.

- A new built-in that is missing from the copy falls to the `readOnlyHint` branch. The mode blocks the call unless the tool is annotated read-only. The mode stays read-only, and only the block message differs.
- A built-in that carries `readOnlyHint: true` and is missing from the copy opens by accident. This is the failure that matters.

The class of failure is real. `ask` (`/app/src/server/extensions/ask.ts`) and `design_preview` (`/app/src/server/design/index.ts`) carry `readOnlyHint: true` today. Both names sit in `ALLOWED_TOOLS`, so `modeGate` allows them at the allowed check and never reaches the copy.

## Goals / Non-Goals

**Goals:**

- Fail a repository check when the module's built-in tool inventory differs from the host's from `BUILT_IN_TOOLS`.
- Cover every module that keeps a copy, now and later, without a list to maintain.
- Keep the check local: no new dependency, no new tool runner, and no edit outside this repository.

**Non-Goals:**

- No change to `modeGate`: same order, same allow set, same block messages.
- No deletion of `BUILT_IN_TOOL_NAMES`.
- No runtime guard, and no dependency on an internal host member.
- No new test runner, no `package.json`, and no `.github` workflow.
- No edit to `/app`.

## Decisions

- **Put the guard in `scripts/check.sh` as 1 extra step (design A).** This script is the only automated step that this repository runs, and `AGENTS.md` already requires exit code 0 from it before a commit. Alternatives considered and rejected:
  - A `*.test.ts` file. Rejected: no runner exists, and `scripts/check.sh` skips `*.test` files, so the file would never run.
  - A runtime check in the module. Rejected: no public API gives the built-in names, so the module cannot read the host set.
  - A request to Pi Pocket for a public API. Rejected as out of scope: it moves the fix to another repository and does not protect this one now.

- **Compare with exact set equality, in both directions.** The host list is the reference. A subset test would let a stale extra name pass, and an extra name weakens the fail-closed inventory. Equality gives 1 clear failure message with both differences.

- **Find the module set by its anchor, not by a path.** The step looks in `extensions/*/*.ts` for the text `BUILT_IN_TOOL_NAMES = new Set([`, and reads the quoted names up to the closing `]);`. A hardcoded path would cover 1 file and would miss a second module with a copy. The anchor text is the pattern that the module already uses, so no second place to maintain.

- **Find the host source through the types symlink, not through a fixed `/app` path.** `$drop_in/_pocket.d.ts` is a symlink to `/app/types/pocket.d.ts`. `readlink -f` on it, `dirname` twice, then `/src/server/reload.ts` gives the host file. On an installed app without source, that path is absent, and the step skips. The step reads `BUILT_IN_TOOLS: ReadonlySet<string> = new Set([` the same way it reads the module set.

- **Hold 4 rules in the step, so that a broken extraction cannot look like a pass.**
  1. A run that extracts 0 names from either side is a failure, never a pass.
  2. A host file that exists but holds no anchor is a failure.
  3. The module set comes from the anchor, so any module with a copy is covered.
  4. The skip is printed and never silent. The person sees that no comparison happened.

- **Update the header comment of `scripts/check.sh`.** The script does 2 jobs after this change: it type-checks each module, and it compares each copied inventory. A header that names 1 job would be wrong.

- **Keep the comparison before the type-check loop, and fail fast.** The comparison step runs before the module type-check loop. A failed comparison exits the script with a non-zero code at once, and no module type-check runs. The step sits before the loop because a wrong inventory makes the fail-closed data of the gate wrong, so a type-check result adds nothing. A comparison that passes prints the 2 name counts, and the type-check loop then runs as it does today. A comparison that skips, because the host source is absent, prints its skip line and lets the type-check loop run.

## Risks / Trade-offs

- [A new built-in reaches `reload.ts` and nobody runs `scripts/check.sh` before the change lands here] → The guard is local only. It protects a commit and not a pushed branch. This is an accepted consequence, recorded in the proposal.
- [The anchor text changes in a future edit, so the step finds 0 names] → Rule 1 and rule 2 turn that into a failure, and the message names the anchor it looked for.
- [The extraction reads a comment or a string by accident] → The step reads only the quoted names between the anchor and the closing `]);`, and it prints the 2 counts on success, so a wrong count is visible.
- [The check fails on a machine with the host source absent] → The step prints its skip and continues, as the types check already stops for a missing `_pocket.d.ts`.
- [The check duplicates a host-side invariant] → The host keeps its own list in step by hand, and no test on the host side checks it. This change does not edit `/app`. The guard stays on the drop-in side, and it only covers the copy.

## Migration Plan

1. Add the step to `scripts/check.sh`, and update the header comment.
2. Run `scripts/check.sh` here, where the host source is present, and confirm exit code 0 with the 2 counts printed.
3. Remove 1 name from a copy in a scratch copy of the module to confirm the failure message, then restore it. Do this without an edit to the committed module.
4. Rollback is the removal of the step and the header change. The module and the gate are untouched, so no data and no API migration applies.

## Open Questions

None.
