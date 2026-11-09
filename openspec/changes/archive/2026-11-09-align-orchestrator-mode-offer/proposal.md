# Proposal

## Why

Orchestrator mode blocks tool calls when they happen, but the prompt of an enabled conversation still offers tools that the gate refuses. The orchestrator reads that offer, loads the tool, pays a round trip and the tool's full description and schema, and only then learns that the call is blocked.

With codemode in its only-scripts setting, the false offer appears in 2 places: the deferred tools list of tool search, and the callable-tools listing of the codemode section, where blocked tools appear with full parameters. A blocked call from a script also costs a failed script, not only a failed call.

The gate answers with 1 sentence for every blocked tool, and that sentence tells the orchestrator to delegate even when the real rule is different: the mode offers read-only tools, and this tool is not one of them.

## What Changes

- The module derives 1 rule from its 3 tool sets, and 3 readers use it: the gate, the deferred tools offer, and the codemode offer.
- While the mode is on, the deferred tools offer does not list a tool that the gate blocks. background stays in the list, because only its start action is blocked.
- While the mode is on, the codemode offer does not show the blocked tools it lists today, such as bash, write, edit, secret_request, and secret_save, or the watcher and session tools when the deployment has them.
- A section whose whole content is removed does not appear at all.
- The block message names the tool, the mode's rule, and the escape hatch: a subagent can receive the tool in its tools grant.
- The orchestrator prompt gains 1 sentence that states the mode's rule and where a step that needs another tool goes.
- No change to what the gate blocks. The 3 tool sets keep their order and their meaning, and the fail-closed rule for built-in tools stays.
- No change to the allowlist, and no new tool, command, route, or setting.
- No change to Pi Pocket. The module reads and rewrites the text of 2 prompt sections through the extension API's section wrapper.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- orchestrator-mode: 3 requirements are added. The offer must agree with the gate, the block message must name the mode's rule, and the prompt must state that rule. The existing requirement "Allowlisted tools while mode is on" keeps every decision it makes today, and it keeps the statement that the gate works at call time and does not change the tool list that a request offers.

## Impact

- 1 module changes: extensions/orchestrator-mode/orchestrator-mode.ts.
- No public API, dependency, install, or storage change. The mode reads the state document it already reads.
- The prompt of each conversation with the mode on changes. A conversation with the mode off is not affected.
- The filter depends on the text formats of 2 sections of Pi Pocket. It can only remove text, so a format change returns the previous behavior and cannot add a false offer.
- The repository has no test runner. The type check in scripts/check.sh covers types only, and the prompt text is checked by hand in a conversation with the mode on.
