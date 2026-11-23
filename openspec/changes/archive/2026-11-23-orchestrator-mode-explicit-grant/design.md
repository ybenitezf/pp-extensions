# Design

## Context

See proposal.md - Why. The module already has every seam this change needs: `modeGate` is the `beforeTool` hook that can block a call with a message the model receives, `ORCHESTRATOR_PROMPT` is the section that instructs the caller, and both already exempt subagent conversations via `isSubagentConversation` and resolve the mode via `isOn`. The host hook API can block a call before it runs, but it cannot rewrite arguments, and the spec requires the module to leave subagent call arguments unchanged. Host facts that shape the design (from `src/server/extensions/subagents.ts`): a spawn `tools` argument is an exact allowlist validated against the parent's tools, deferred, and callable sets; a tool whose definition carries `subagents: "always"` is auto-added to every grant; `codemode` is auto-added to a grant that contains a script-only tool.

## Goals / Non-Goals

**Goals:**

- Make an unnamed or empty tools grant on spawn impossible while orchestrator mode is on, with a block message that teaches the correct spawn.
- Point the caller at `codemode` in every grant, because it batches independent child tool calls and filters large command output before it enters the child's context.

**Non-Goals:**

- Judging the membership of a non-empty grant.
- Gating `tool_search`: a child with `tool_search` could load deferred tools the caller deliberately withheld, so the decision is to leave it to the caller's grant, not to require or forbid it.
- Changing the installed pi-pocket package, the host's resolution of a missing or empty `tools` argument, or the host default tool set.

## Decisions

**1. Gate on spawn with a missing or empty `tools` argument, in `modeGate`.**
When the caller is not a subagent conversation and the mode is on, a `subagent` call with action `spawn` and `tools` absent or `[]` is blocked. Alternative considered: rewrite the arguments to a safe default. Rejected because the hook API cannot rewrite arguments, and rewriting would break the requirement that the module must not change subagent call arguments.

**2. The spawn branch sits beside the existing `background` action branch.**
The hook already reads `call.arguments` into `args`, and `subagent` is in `ALLOWED_TOOLS`, so an early `ALLOWED_TOOLS` return would bypass a check placed after it. The spawn check goes in as a keyed branch on `call.name === "subagent" && args.action === "spawn"` before that return, next to the `background` branch it mirrors. Actions `send`, `stop`, and `status` never enter the branch.

**3. A separate message builder for the unnamed-grant block.**
The existing `blockedToolMessage` answers blocked tools; its text does not fit a spawn grant. A second builder states that a spawn without a named grant gives the child the default tool set, including `write`, `edit`, and `bash`, and directs the caller to set `tools` to a non-empty list of exact tool names.

**4. A non-empty grant passes without inspection.**
The host auto-adds `subagents: "always"` tools and `codemode` to qualifying grants, so the effective set of any grant already exceeds its named list; a membership check would false-positive on grants the caller judged correctly. Membership stays the caller's judgment.

**5. `codemode` is prompt encouragement, not a gate.**
`codemode` adds no capability the grant does not already name, so enforcing it would only cost a retry round trip whenever the caller forgets. `ORCHESTRATOR_PROMPT` gains one sentence that directs the caller to always include `codemode` in the tools grant of every spawn; the sentence sits with the existing grant sentence. The host already treats `codemode` as ambient infrastructure.

**6. Exemptions and the off state stay as they are.**
The existing subagent-conversation exemption runs before the mode check in the hook, and the prompt section returns early for subagents, so both keep their behavior with no new code. While the mode is off, the hook returns before the new branch, so nothing changes.

## Risks / Trade-offs

- [A caller that wanted the host default set is blocked once] → The default set contains tools the parent session does not have (`glob`, `grep`, `task`), so the caller cannot reason about it; naming the grant is safer, and the block message states the fix.
- [`tools: null` or a non-array value reaches the host] → Out of scope: the gate matches the decided condition exactly, a missing or empty array, and the host owns validation of other shapes.
- [The prompt grows by one sentence] → Negligible against the token cost of unbatched child tool calls that the sentence prevents.
- [Live verification needs a real spawn] → The verification spawns one child without `tools` and one with a non-empty grant while the mode is on; both children get a brief that needs no write access.

## Migration Plan

Rebuild-free: edit the module, run `scripts/check.sh`, copy the module into the Pi Pocket drop-in folder per `.agents/skills/extension-dropin/SKILL.md`, and verify live. Rollback is `git revert` of the one commit plus a fresh copy into the drop-in folder. Stored mode state needs no migration; the gate reads the same document.

## Open Questions

None.
