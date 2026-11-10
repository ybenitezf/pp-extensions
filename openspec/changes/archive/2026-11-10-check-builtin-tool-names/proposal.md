# Proposal

## Why

The module `extensions/orchestrator-mode/orchestrator-mode.ts` keeps `BUILT_IN_TOOL_NAMES`, a hand-kept copy of the host's `BUILT_IN_TOOLS` set of 31 built-in tool names.

`modeGate` lets the call pass when the mode is off, and it decides in this order when the mode is on. `isBlockedByMode` gives 1 answer from 4 tests: a name in `EXPLICITLY_BLOCKED_TOOLS` blocks, the name `background` does not block, a name in `ALLOWED_TOOLS` does not block, and a name in the copy blocks. A blocked answer stops the call there. Then `modeGate` blocks a `background` tool with action `start`, passes another action, and passes a name in `ALLOWED_TOOLS`. Last, it passes the live tool when `annotations.readOnlyHint === true`, and it blocks every other tool.

The copy is the fail-closed step. A built-in is blocked because its name is in the copy. A documented scenario depends on a name in the copy: the mode blocks the reserved legacy tool `artifact_inline` because its name is in the copy.

The drift has 2 directions. A new built-in that is absent from the copy falls to the `readOnlyHint` test, and the gate blocks it anyway, unless the host annotates it read-only. In that case only the block message differs. But a built-in that carries `readOnlyHint: true` and is absent from the copy opens by accident, and the mode stops being read-only.

The second direction is real, not hypothetical. 2 built-ins carry `readOnlyHint: true` today: `ask`, in `/app/src/server/extensions/ask.ts`, and `design_preview`, in `/app/src/server/design/index.ts`. Both names are in `ALLOWED_TOOLS`, so the gate allows them, and it never reads the copy.

The 2 sets are equal today: 31 names each, and the difference is empty in both directions. So this is a maintenance risk, not a live fault.

## What Changes

- Add 1 check step to `scripts/check.sh`. The step compares the module's `BUILT_IN_TOOL_NAMES` set with the host's `BUILT_IN_TOOLS` set in `/app/src/server/reload.ts`. The comparison is exact set equality, in both directions.
- The check holds 4 rules:
  - A run that extracts 0 names is a failure, never a pass.
  - When the host file exists but the anchor is missing, that is a failure.
  - The check finds the module set by its `BUILT_IN_TOOL_NAMES = new Set([` anchor, not by a hardcoded module path. Any future module with a copy is covered.
  - The skip is printed and never silent.
- Add 1 requirement to the `orchestrator-mode` delta spec. The module MUST keep its built-in tool inventory equal to the host's `BUILT_IN_TOOLS`. A difference MUST fail `scripts/check.sh`. The requirement has 3 scenarios: the sets match, the host source is absent, and the sets differ.
- Update the header comment of `scripts/check.sh`, because the script does 2 jobs after this change.

No change to the module file. No change to the gate.

### Out of scope

- No change to the gate's behavior. The `modeGate` keeps `isBlockedByMode` and its 4 tests, the `background` action test, and the `readOnlyHint` test. The message that `blockedToolMessage` returns does not change, and the call still passes when the mode is off.
- No deletion of the copy. No public extension API exposes the built-in tool names. `host.toolNames()` exists at `/app/src/server/host.ts`, but it is internal, it is absent from `_pocket.d.ts`, and a drop-in MUST NOT use internal members. `ToolExecutionApi.registry` is reachable only inside a tool's `execute`, not from a hook.
- No request to Pi Pocket for a public API.
- No new test runner and no CI. This repository has no `package.json`, no `node_modules`, no `*.test.ts` file, and no `.github` folder. `scripts/check.sh` skips `*.test` files.
- No edit to `/app`. The check reads the host source and never writes it.

### Accepted consequences

- `scripts/check.sh` does 2 jobs after this change. Its header comment must say so.
- The guard is local only. It protects a commit, not a pushed branch.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `orchestrator-mode`: 1 new requirement, "Built-in tool inventory matches the host". It states that the module MUST keep its built-in tool inventory equal to the host's `BUILT_IN_TOOLS`, and that a difference MUST fail `scripts/check.sh`. The requirement adds 3 scenarios. The existing requirements do not change.

## Impact

- `scripts/check.sh`: 1 new check step, and a header comment that names both jobs.
- `extensions/orchestrator-mode/orchestrator-mode.ts`: no change. The copy stays as it is, and the gate keeps its order and its behavior.
- `openspec/specs/orchestrator-mode/spec.md`: changes only after apply and archive.
- `/app`: read-only. The check reads `src/server/reload.ts` through the `_pocket.d.ts` symlink in the drop-in folder, and appends `/src/server/reload.ts`. On an installed app without source, that path is absent, and the check skips with a printed message.
- No dependency, no CI, and no test runner.
