# Design

## Context

The orchestrator-mode prompt currently tells Pi to omit `tools`. The built-in subagent schema defaults an omitted grant to the caller's tools. When Pi supplies a grant, the host validates names against the parent's available `tools`, `deferred`, and `callable` tools, then fixes that grant for the child. A later `send` does not update it. See proposal.md for the problem and scope, and `specs/orchestrator-mode/spec.md` for the behavior contract.

The mode's hook blocks selected calls at runtime; it does not remove tools from the session's advertised tool list. Subagent conversations bypass this gate. The host's subagent section also says to stop and report failures caused by the model or provider.

## Goals / Non-Goals

**Goals:**
- Make each spawn's grant explicit and limited to the task, including read-only tasks.
- Keep the grant valid against the parent's available tool inventory.
- Make the prompt's retry guidance consistent with the host's model/provider failure rule.

**Non-Goals:**
- Change the host's subagent tool, advertised tool list, or tool-validation behavior.
- Change the orchestrator-mode runtime gate or its allowlist.
- Change the model-selection policy or permit a model change to bypass a model/provider failure.

## Decisions

1. **Set `tools` on every spawn.** Replace the prompt instruction to omit the argument. Direct Pi to name only the tools needed for that task, using the exact names available to the parent. A read-only task still gets an explicit grant, such as `read` when that is all it needs. This avoids inheriting an unspecified, potentially broad set. Alternative: keep omission for read-only tasks. Rejected because it leaves the child grant implicit and fails the agreed rule that every spawn is task-scoped.

2. **Spawn a new child when the grant must change.** The grant is fixed at spawn, and `send` cannot modify it. Reuse a child only when its existing grant covers the next task. Otherwise, spawn a child with the new task's minimal grant. Alternative: reuse the child with a union of tools. Rejected because the union gives the child tools it does not need for the new task.

3. **Separate task failures from model/provider failures.** Keep one corrected retry for a task-level failure, on the same model. If the retry needs a different grant, use a new child with that grant. For a model/provider failure, stop and report it under the host's subagent guidance; do not retry on another model. This makes the extension prompt consistent with the core subagent section. Alternative: retry every failure. Rejected because it conflicts with host guidance and could mask a provider or model failure.

4. **Keep runtime behavior unchanged.** The extension prompt controls the orchestrator's choices. The mode gate remains a call-time gate, and the host continues to validate explicit tool names against the parent's available tools. No tool inventory or grant is created by this extension.

## Risks / Trade-offs

- [A requested tool is not available to the parent] → The host rejects the grant. Pi must use exact available tool names and stop to report a missing tool rather than inventing one.
- [An explicit grant omits a tool the task needs] → The child may be blocked or fail. Pi must define the task and required tools before spawning, then use the one allowed corrected retry for task-level failures.
- [A child is reused for work with a different grant] → The grant cannot change through `send`. The prompt directs Pi to spawn a new child instead of granting a broad union.
- [A provider failure is treated as a task failure] → The retry instruction could conflict with host guidance. The prompt and spec distinguish model/provider failures and require Pi to stop and report them.

## Migration Plan

No data or host migration is needed. Update the orchestrator-mode prompt and its spec. Turn orchestrator mode on and inspect the prompt; verify that each spawn uses an explicit minimal grant, that changed grants use a new child, and that model/provider failures are reported without a retry on another model. Revert the prompt and spec changes to roll back.
