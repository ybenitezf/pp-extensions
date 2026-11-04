# Design

## Context

Plan mode provides the host pattern: a conversation-scoped durable document, a conditional prompt section, a `beforeTool` gate, a composer chip, and a command. The gate does not change the model's tool list. Plan mode is not a security boundary; Lancet Guard is (`/app/src/server/extensions/plan.ts:5`).

The built-in `subagent` tool validates `model` against the owner's allowlist and refuses any other model (`/app/src/server/extensions/subagents.ts:744-796`). Its schema offers `model` only when that list is non-empty (`/app/src/server/extensions/subagents.ts:804-838`). Pi Pocket's `<subagents>` prompt section already tells the model which models the user allows (`/app/src/server/extensions/subagents.ts:690-722`). If the module chose `model` or `tools`, it would override the orchestrator's judgement with less information and contradict the mode's purpose. The module leaves `model`, `tools`, `thinking`, and `followUp` unchanged.

The built-in tool does not retry a failed child on another model (`/app/src/server/extensions/subagents.ts:766-796`). A spawned child has its own conversation (`/app/src/server/extensions/subagents.ts:1015-1032`). The durable mode document belongs to the orchestrating conversation, so the gate is parent-only by construction; a child has no such document. Verify this before release.

The roster is 4 Pi tools, 27 Pi Pocket built-ins, and 3 enabled drop-in tools. Pi Pocket installs no tool named `ls`, `grep`, `find`, or `powershell`: the built-in catalog names none of them (`/app/src/server/reload.ts:117-149`), no module registers one, and the only 2 matches in `/app/src` are a git subcommand (`/app/src/server/extensions/plan.ts:80`) and a slash-command name (`/app/src/server/extension-web.ts:93`). The arithmetic closes: `/app/src/server/reload.ts` `BUILT_IN_TOOLS` holds 31 names (declaration line 117, first name `read` at line 118, last name `design_system` at line 148, literal closes at line 149), and the 3 drop-in tools come from `/data/extensions/secrets.ts:580-583`, so 31 + 3 = 34. The module copies the same 31 built-in names in `BUILT_IN_TOOL_NAMES` (`extensions/orchestrator-mode/orchestrator-mode.ts:65-97`), and the two sets are identical. On this host `team` is off because the owner disabled `agent-teams.ts` (`/data/config.json:66-68`), and `ask_someone` is off by default because `ask-someone.ts` stays off until the owner turns it on (`/app/src/server/reload.ts:79,82`); an off module is not loaded (`/app/src/server/reload.ts:442-446`), so the enabled source-level inventory is 32 (34 - 2). Verify the 34-tool roster and the `subagent` schema against source before implementation.

## Goals / Non-Goals

**Goals:**
- Implement one conversation-scoped mode with the `PlanDoc` state shape and Plan-like user controls.
- Build the mode from 3 parts: a durable document, a conditional prompt section, and a `beforeTool` gate; add the composer chip and `/orchestrator-mode` command.
- Enforce the specified call-time allowlist and declare no tool of its own.

**Non-Goals:**
- Change the model's advertised tool list or create a security boundary.
- Decide a child model or tool set, or change `subagent` arguments.
- Execute shell commands in the orchestrator or copy another package's behavior one-to-one.
- Add per-model dollar ceilings or fail-over to another model. A module does not see per-run usage or cost, and the built-in tool does not retry a failed child.

## Decisions

### Use a conversation document and Plan-like controls

Store one conversation-scoped durable document of kind `orchestrator-mode`, with `on`, `by`, and `at`. Add a conditional prompt section named `orchestrator_mode`, a `beforeTool` hook, one composer chip, and the `/orchestrator-mode` command. The composer chip belongs to the browser part (see "Ship the browser part"), not the server module. This follows the host's Plan mode pattern and keeps state per conversation.

The module appends a prompt section and does not replace the system prompt, so core instructions stay in effect. The original package replaced the system prompt, which is why it carried every rule itself. This module does not copy that behavior.

Section keys share one namespace. A later extension that uses a core key replaces that section. The keys in use are `guidelines`, `subagents`, `pip_rules`, and `agent-teams`. This module uses only `orchestrator_mode`.

### Gate calls with an allowlist in the hook

Use an allowlist, not a blocklist. Permit the specified built-ins and non-built-in tools only when `annotations.readOnlyHint === true`. Permit `background` only when `args.action !== "start"`. Block `bash` deliberately. Plan mode uses a blocked-tool predicate, but the allowlist better expresses the required fail-closed behavior. This hook is a behavior guard, not a security boundary; Lancet Guard remains that boundary. The gate does not change the model's tool list.

### Keep child choices with the orchestrator

The orchestrator already receives the user's allowed model roster in the `<subagents>` prompt section. The built-in tool validates the supplied `model`; the module adds no information that would improve the orchestrator's choice. Keep all `subagent` arguments unchanged: the module sets none of `model`, `tools`, `thinking`, or `followUp` on the call (`extensions/orchestrator-mode/orchestrator-mode.ts`), so the delta-spec requirement `Unchanged subagent arguments` holds. A child may receive a tool set wider than the orchestrator allowlist when the orchestrator supplies it. Decision: the orchestrator, not the module, decides the child tool set, and the prompt now requires that decision to be explicit. The agreed prompt text is a 4-paragraph string (`extensions/orchestrator-mode/orchestrator-mode.ts:99-105`). Its load-bearing sentences are: "Set the tools of each child explicitly, and state in every brief whether it may change files and which paths it may touch." and "Never give two children the same file to change. Chain work on one file, or on one folder, one child at a time."

### Verify host behavior before coding

An independent verifier must confirm the 34-tool roster (31 built-in names at `/app/src/server/reload.ts:117-149` plus 3 drop-in tools at `/data/extensions/secrets.ts:580-583`) and `subagent` parameter schema against source. The tool-call part of the `codemode` release blocker is closed: `/app/docs/extensions/hooks.md:37` states that the calls of codemode scripts also go through `beforeTool`, and task 1.2 of `verification.md` traces the path. One residual question stays open: whether a codemode script can write files without making a tool call. The allowlist sees only tool calls, so check that write path before release. Also verify that `defineDoc`, `section`, `hook`, and `web.command` behave as the artifacts assume. `pocket.composerButton` (`/app/types/pocket.d.ts:2684`) is a browser API, so the server module never calls it; the browser part owns the chip. Confirm that a child conversation has no `orchestrator-mode` document; its presence would falsify the parent-only gate design.

### Ship the browser part

The module ships 2 pieces. The server module is `extensions/orchestrator-mode/orchestrator-mode.ts`. The browser part is the folder `extensions/orchestrator-mode/orchestrator-mode/` with `index.js`, registered in the module with `web.client("orchestrator-mode")` (`/app/types/pocket.d.ts:1332-1335`) and a per-conversation toggle route via `web.conversationRoute(...)` (`/app/types/pocket.d.ts:1325-1330`). The browser client reads the conversation with `pocket.conversationId()` (`/app/types/pocket.d.ts:2577`) and adds the chip with `pocket.composerButton(...)` (`/app/types/pocket.d.ts:2684`). The `/orchestrator-mode` command stays in the server module via `web.command(...)` (`/app/types/pocket.d.ts:1340`) with `scope: "conversation"` (`/app/types/pocket.d.ts:1428`), and its handler receives `context.conversationId` and `context.commit` (`/app/types/pocket.d.ts:1450,1475`). The shipped browser part `extensions/openspec-status/openspec-status/index.js` of the `openspec-status` extension is the precedent for this folder shape, registered in `extensions/openspec-status/openspec-status.ts:511,513`. `scripts/check.sh` type-checks only the module `.ts` file (`scripts/check.sh:41`), so the browser part adds no type-check step.

### Visible state of the mode

The host's `PlanBar` names Plan mode and offers “Turn off”; it is core UI mounted inside the dock (`/app/web/composer.js:250-291,1160-1265`).
The built-in `pocket-plan` server module registers `plan_mode` and a `ToolTask` hook, not a `web.client` (`/app/src/server/extensions/plan.ts:312-347`).
An extension has no dock slot (`/app/types/pocket.d.ts:2269`).
The host renders a composer button's `title` as tooltip and `aria-label`, not visible text (`/app/web/extension-ui.js:2235-2241`); `icon` and `badge` are supported visible-state fields (`/app/types/pocket.d.ts:1800-1842`).
The browser API supports a composer button (`/app/types/pocket.d.ts:1842,2684`) whose `update` accepts partial specs (`/app/types/pocket.d.ts:2356-2361`).
A persistent `pocket.status` item was built and tested, then rejected by the person as unwanted interface.
Decision: use one `shield` icon in both states and no badge (`extensions/orchestrator-mode/orchestrator-mode/index.js:9-20`). The composer chip alone shows the mode state, using the Plan chip's border, pill shape, and on-state tint (`extensions/orchestrator-mode/orchestrator-mode/look.css:1-10`; `/app/web/style.css:3768-3793`).
The badge was rejected because the host pins it at `top: 3px; right: 2px` at 17 px on a 40 px `.icon-button`, covering the icon's top-right corner (`/app/web/style.css:1453-1466,1486-1502`).
Widening the button was rejected: `.icon-button` is 40 px and `flex: none`, the composer row has a 6 px gap, and the host notes it needs 335 px in a 334 px box on a 360 px screen; placing the badge outside the circle was rejected too (`/app/web/style.css:1453-1466,3523-3530,3689-3690`).
The host provides `data-module` and `data-part` to scope the button, but no dedicated module state attribute (`/app/web/extension-ui.js:2231-2241`).
`render()` keeps the `shield` icon fixed and updates only `title`; the stylesheet selects the on-state by `title*=": On"` (`extensions/orchestrator-mode/orchestrator-mode/index.js:14-20`; `extensions/orchestrator-mode/orchestrator-mode/look.css:3-10`). Thus `title` is the only mode-state cue in the button DOM.

### Keep installation and release separate

Create only the server module `extensions/orchestrator-mode/orchestrator-mode.ts` and the browser part folder `extensions/orchestrator-mode/orchestrator-mode/`. Check the module with `scripts/check.sh` and require exit code 0. Copy it to the drop-in folder only through `.agents/skills/extension-dropin/SKILL.md`. Update `index.entries.json` only when the owner asks for a release.

## Risks / Trade-offs

- [Tools remain visible in the model's advertised list] → Gate calls at runtime and describe the mode as a behavior control, not a security boundary.
- [A `codemode` script may write files without making a tool call] → The tool-call part is closed (`/app/docs/extensions/hooks.md:37`); verify the no-tool-call write path before release, and remove `codemode` from the allowlist if a script can write files that way.
- [The tool roster can change] → Have an independent verifier confirm the roster and schema before writing module code.
- [A module cannot set per-model dollar ceilings or retry on another model] → Keep both controls out of scope; the module lacks per-run usage and cost, and the built-in tool does not retry failed children.
- [The composer chip API is `@experimental`] → A host upgrade can change `pocket.composerButton` (`/app/types/pocket.d.ts:2680-2684`); re-verify the chip after host upgrades.

## Migration Plan

Release by copying the module through the extension drop-in skill, then test the mode in Pi Pocket. To roll back, turn the mode off or remove the drop-in using that skill. Do not update the gallery entry until the owner requests a release.
