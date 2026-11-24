/** Read-only orchestration mode: read context and delegate work without changing files in the orchestrator. */
import { defineDoc, defineExtension, hook, section, ToolTask, wrapSection } from "@earendil-works/pi-durable";
import type { ToolExecutionApi } from "@earendil-works/pi-durable";
import type {
    CommandContext,
    ConversationWebRequest,
    Host,
    Person,
    Web,
    WebRequest,
    WebSession,
} from "./_pocket.d.ts";

type ModeState = {
    on: boolean;
    by: { id: string; name: string };
    at: string;
};

type Actor = { id: string; name: string };

const OrchestratorModeDoc = defineDoc<ModeState>({
    kind: "x.orchestrator-mode.state",
    version: 1,
    scope: "conversation",
    history: "latest",
    fork: "initial",
    initial: () => ({ on: true, by: { id: "", name: "" }, at: "" }),
    checkpointWhen: () => false,
});

// The web instance of this module, set while it loads. The sections, wraps, and hooks are made at module level,
// before createOrchestratorMode runs, so they read the owner setting through this reference.
let currentWeb: Web | undefined;

// The owner setting that decides the mode of a conversation that stores no state. A host without the settings API
// keeps the current behavior: the mode is on.
function defaultOn(): boolean {
    const web = currentWeb;
    if (web === undefined || typeof web.setting !== "function") {
        return true;
    }

    // Only a boolean false turns the mode off. A missing value or a value of another type falls back to on.
    const value = web.setting("default_on");
    return typeof value === "boolean" ? value : true;
}

// The one owner setting of this module. The host accepts only letters, digits, and underscore in a setting name, so
// the name of the setting is "default_on".
function declareDefaultOnSetting(web: Web): void {
    const field = {
        label: "Orchestrator mode on by default",
        description: "Orchestrator mode is on in a conversation that stores no mode state.",
        type: "boolean" as const,
        default: true,
    };

    web.settings([{ ...field, name: "default_on" }]);
}

// The effective state of a conversation: its stored state when it has one, and the owner setting when it has none.
function isOn(state: ModeState | undefined): boolean {
    if (state === undefined) {
        return defaultOn();
    }

    return state.on;
}

// The record marker: the time field is empty only in the document's initial value. Every write fills it, so a stored
// record has a non-empty time and a conversation that stores no record has an empty time. The marker tells a captured
// record from the initial value, which both hold an empty actor and can hold the same on value.
function storesNoRecord(state: ModeState): boolean {
    return state.at === "";
}

const SUBAGENT_INSTRUCTIONS_PREFIX = 'You are the subagent "';
const MAX_SUBAGENT_CONVERSATION_IDS = 2000;

// A Set keeps insertion order, so the first id is the oldest one. A reload empties this Set, and the instructions
// prefix alone answers then.
const subagentConversationIds = new Set<number>();

function rememberSubagentConversation(conversationId: number): void {
    if (subagentConversationIds.has(conversationId)) {
        return;
    }

    if (subagentConversationIds.size >= MAX_SUBAGENT_CONVERSATION_IDS) {
        for (const oldest of subagentConversationIds) {
            subagentConversationIds.delete(oldest);
            break;
        }
    }

    subagentConversationIds.add(conversationId);
}

// The prefix is the text that Pi Pocket writes in src/server/extensions/subagents.ts of the installed pi-pocket npm package when it makes a child.
function isSubagentConversation(
    conversationId: number,
    agent: { readonly instructions?: string } | undefined,
): boolean {
    return (
        subagentConversationIds.has(conversationId) ||
        agent?.instructions?.startsWith(SUBAGENT_INSTRUCTIONS_PREFIX) === true
    );
}

// Commands have no session list, so this cache carries route membership; a subagent id can never enter it.
const sessionIdsByPerson = new Map<string, Set<number>>();

function rememberSessions(user: Person, sessions: readonly WebSession[]): Set<number> {
    const ids = new Set(sessions.map((session) => session.id));
    sessionIdsByPerson.set(user.id, ids);
    return ids;
}

function readSession(request: WebRequest): { session: boolean } {
    const id = Number(request.params.id);
    const sessionIds = rememberSessions(request.user, request.sessions());
    return { session: Number.isInteger(id) && sessionIds.has(id) };
}

function isSession(personId: string, conversationId: number): boolean {
    return sessionIdsByPerson.get(personId)?.has(conversationId) === true;
}

const ALLOWED_TOOLS = new Set([
    "read",
    "subagent",
    "ask",
    "tool_search",
    "codemode",
    "artifact",
    "sessions",
    "session_read",
    "design_preview",
    "secrets_list",
    "schedule",
    "watch_pr",
    "memory",
]);

// These named tools stay blocked even if a wrapper or module adds a read-only annotation.
// Bash is explicitly blocked because a shell command can write files or start processes.
const EXPLICITLY_BLOCKED_TOOLS = new Set([
    "write",
    "edit",
    "bash",
    "session_start",
    "session_send",
    "session_follow",
    "session_stop",
    "session_archive",
    "session_schedule",
    "team",
    "repo_watch",
    "session_watch_pr",
    "approvals",
    "ask_someone",
    "secret_request",
    "secret_save",
    "design_export",
    "design_system",
]);

// Pi core and Pi Pocket built-in tool names. Keep this inventory aligned with the host's BUILT_IN_TOOLS set.
// The host still keeps artifact_inline in its set as a reserved name since pi-pocket 0.28.0, so this set stays aligned.
const BUILT_IN_TOOL_NAMES = new Set([
    "read",
    "write",
    "edit",
    "bash",
    "artifact",
    "artifact_inline",
    "browser",
    "subagent",
    "team",
    "schedule",
    "background",
    "codemode",
    "tool_search",
    "memory",
    "sessions",
    "session_read",
    "session_start",
    "session_send",
    "session_follow",
    "session_stop",
    "session_archive",
    "session_schedule",
    "approvals",
    "watch_pr",
    "repo_watch",
    "session_watch_pr",
    "ask",
    "ask_someone",
    "design_preview",
    "design_export",
    "design_system",
    "relay_reply",
]);

function isBlockedByMode(toolName: string): boolean {
    if (EXPLICITLY_BLOCKED_TOOLS.has(toolName)) {
        return true;
    }

    if (toolName === "background") {
        return false;
    }

    if (ALLOWED_TOOLS.has(toolName)) {
        return false;
    }

    return BUILT_IN_TOOL_NAMES.has(toolName);
}

function blockedToolMessage(toolName: string): string {
    return `Orchestrator mode is on: ${toolName} is blocked. Orchestrator mode offers read-only tools only. A subagent can receive ${toolName} in its tools grant.`;
}

function blockedSpawnGrantMessage(): string {
    return "Orchestrator mode is on: a spawn without a named tools grant gives the child the default tool set, including write, edit, and bash. Set the tools argument to a non-empty list of exact tool names.";
}

const ORCHESTRATOR_PROMPT = `TERMS
- child: a subagent that spawn starts.
- step: one unit of delegated work.
- wave: the dependency-ready steps that you select and send together.
- terminal outcome: the final status of a step: completion, failure, or blocker. Silence and active work are not terminal.
- tools grant: the tools argument of spawn: a non-empty list of exact tool names, fixed at spawn.
- brief: the instruction text that you write to a child.
- allowlist: the models that the owner permits.
- diff: the added, removed, or changed steps and edges, with the reason for each change.

BEFORE WORK
1. Read the relevant context first.
2. Delegate the work to children.
3. Change no file yourself: you have read-only tools only.
4. If a step needs another tool: add that tool to the child's tools grant.
5. Plan a graph of steps and dependencies.
6. Show the plan steps to the person.
7. Set the tools grant of each spawn to the smallest set the task needs, also for read-only tasks.
8. Include codemode in every tools grant.
9. Use the exact tool names available to you.
10. Set the tools argument on spawn only, not on send, stop, or status.
11. If later work needs a different grant: spawn a new child.
12. State in every brief whether the child may change files, and the paths.
13. Give no two children the same file to change.
14. Chain work on one file, or one folder, to one child at a time.
15. Keep wave membership and step outcomes in the conversation context only.
16. Create no persistent or runtime tracker.
17. Compare each allowed model's known input and output price per million with the task.
18. Invent no cost formula.
19. Prefer the lowest-cost allowed model that can do the task.
20. If only a higher-cost model has the capability: choose it, name the capability.
21. Name no generic reason such as better quality.
22. If a model has no known price: treat the price as unknown, not low.
23. If a model has an unknown price: choose it only when its capabilities justify it.
24. Invent no model outside the allowlist.
25. List the effective provider/modelId of every spawn in the visible plan.
26. If a spawn omits model: name the current-session model as the effective model.
27. Give one task-specific capability reason for each higher-cost or unknown-price choice.
28. Give no reason for a lowest-cost, known-price, capable choice.
29. Give each brief the role, ordered steps, exact paths and names, limits, and acceptance check.
30. Write each brief to the child in ASD-STE100.
31. Ask each child for its report in ASD-STE100.
32. Ask each child for paths, short excerpts, and findings.
33. Ask for no file dump.
34. Carry decisions and findings into later briefs.
35. Pass no bare path without the reason for it.

DURING A WAVE
36. A wave with 2 or more steps MUST be 1 codemode script that spawns every child of that wave.
36.1. A wave with 1 step stays a plain spawn call and sends no wave script.
36.2. Each spawn call in the script MUST be awaited, and the script MUST NOT wait for terminal outcomes.
36.3. Each spawn in the script sets its own tools argument, under the same rules as any other spawn.
36.4. The dependency graph and the wave order stay as prose in conversation context.
37. Send a dependent step only after its needed steps finish and you check their results.
38. Stop splitting a step when a sub-step needs another child's result.

AFTER A WAVE
39. You wait for a terminal outcome from every step in the wave. The wait is your work, not the work of a wave script.
40. Send no step of a later wave early.
41. Record failures and new evidence.
42. Reduce the outcomes and check each result with read.
43. Audit each pending step and dependency for need, work and acceptance criteria, dependencies, and readiness.
44. Preserve completed steps and their results.
45. Preserve the original request scope.
46. Change pending work only when evidence materially affects it.
47. If the graph is unchanged: state that the remaining graph is unchanged.
48. If the graph changes: show the diff, with the reason for each change.
49. Recompute the future waves after any change.
50. Show the next wave before you send it, as a short summary. The summary MUST state each step name, the effective model of each step, and the tools grant of each step. The summary MUST show the codemode script that will launch the wave, or state that the wave uses a plain spawn call. The \`code\` passed to \`codemode\` MUST be the same script shown in the summary.
51. Include no concurrent-call count, in any wording, in the diff or the next-wave summary.
52. If the work would alter or expand the request: pause and ask the person.
53. Use exactly one independent verifier for a claim you cannot repeat yourself.
54. Spawn no verifier when you can repeat the result yourself.
55. Run the verifier on a model that differs from the child's model.
56. If an allowed model from a different provider exists: prefer that provider.
57. If the allowlist has one model: verify on it and disclose the weaker check.
58. Give the verifier a clean-room brief that states the task and the check.
59. State no claimed result in the verifier brief, and imply none.
60. Verify no verifier.
61. Continue a partial result; do not restart it.
62. Answer the person in normal English with the reports reduced to a clear answer.
63. Name the changed files in the answer.

ON FAILURE
64. If a step fails, a fact contradicts the plan, or new work appears: re-plan and show the diff.
65. If a task-level failure is not from the model or provider: read the error, correct the brief.
66. Retry that work once on the same model.
67. If the retry needs a different tools grant: spawn a new child.
68. If a child fails because of its model or provider: stop and tell the person.
69. Retry no such work on another model.
70. Say no step passed when it was not run.
71. If a wave script ends with a partial wave, you MUST check the status of every child named by that script before you retry the script. A partial wave can come from an interruption, a guard block, a tool error, or any other abort. The check covers the children that started and the children that did not start.`;

const orchestratorSection = section("orchestrator_mode", async (input, context) => {
    if (isSubagentConversation(input.conversationId, input.agent)) {
        return undefined;
    }

    const state = await input.read.snapshot(OrchestratorModeDoc, input.conversationId, context);
    return isOn(state) ? ORCHESTRATOR_PROMPT : undefined;
});

function stripBlockedDeferredTools(text: string): string {
    return text
        .split("\n")
        .filter((line) => {
            const match = /^- ([A-Za-z0-9][A-Za-z0-9_-]*): /.exec(line);
            if (match === null) {
                return true;
            }

            return !isBlockedByMode(match[1].trim());
        })
        .join("\n");
}

function stripBlockedCodemode(text: string): string {
    const kept: string[] = [];

    for (const paragraph of text.split("\n\n")) {
        const block = /^## ([A-Za-z0-9][A-Za-z0-9_-]*)$/.exec(paragraph.split("\n")[0]);
        if (block !== null) {
            if (!isBlockedByMode(block[1])) {
                kept.push(paragraph);
            }
            continue;
        }

        const trailing = /^Also callable, not listed: (.+)$/.exec(paragraph);
        if (trailing !== null) {
            const remaining = trailing[1]
                .split(",")
                .map((name) => name.trim())
                .filter((name) => name.length > 0 && !isBlockedByMode(name));
            if (remaining.length > 0) {
                kept.push(`Also callable, not listed: ${remaining.join(", ")}`);
            }
            continue;
        }

        kept.push(paragraph);
    }

    return kept.join("\n\n");
}

function filteredOfferSection(key: string, strip: (text: string) => string) {
    return wrapSection(key, (inner) => ({
        ...inner,
        render: async (input, context) => {
            const text = await inner.render(input, context);
            if (text === undefined) {
                return undefined;
            }

            // A subagent keeps the offers as their source sections render them.
            if (isSubagentConversation(input.conversationId, input.agent)) {
                return text;
            }

            const state = await input.read.snapshot(OrchestratorModeDoc, input.conversationId, context);
            if (!isOn(state)) {
                return text;
            }

            const filtered = strip(text);
            return filtered.length === 0 ? undefined : filtered;
        },
    }));
}

const deferredToolsOffer = filteredOfferSection("deferred_tools", stripBlockedDeferredTools);
const codemodeOffer = filteredOfferSection("codemode", stripBlockedCodemode);

async function toggleMode(
    commit: CommandContext["commit"],
    conversationId: CommandContext["conversationId"],
    actor: Actor,
): Promise<ModeState> {
    return await commit(async (tx) => {
        const state = await tx.doc(OrchestratorModeDoc, conversationId);
        // A conversation that stores no record follows the owner setting, so the first press captures that value and
        // inverts it. A conversation that stores a record inverts its stored value, not the current setting.
        const effective = storesNoRecord(state) ? defaultOn() : state.on;
        state.on = !effective;
        state.by = { id: actor.id, name: actor.name };
        state.at = new Date().toISOString();
        return { on: state.on, by: state.by, at: state.at };
    });
}

function publishChange(web: Web, conversationId: number): void {
    web.send("changed", { conversationId });
}

// The GET route is a read path that can write, so it captures the owner setting in a conversation that stores no
// record. The capture stores the current setting, leaves the actor empty because no person made a choice, and writes
// the time of the capture, so every record carries the marker and a later read and a later toggle can tell it from a
// conversation that stores no record. A second request finds the record that the first one stored and keeps it.
async function readMode(request: ConversationWebRequest): Promise<{ on: boolean }> {
    const conversationId = request.conversation.id;
    const state = await request.snapshot(OrchestratorModeDoc, conversationId, request.context);
    if (state !== undefined) {
        return { on: state.on };
    }

    try {
        const captured = await request.commit(async (tx) => {
            const doc = await tx.doc(OrchestratorModeDoc, conversationId);
            // Another request captured first, so the stored record stays and its value is the answer.
            if (!storesNoRecord(doc)) {
                return doc.on;
            }

            doc.on = defaultOn();
            doc.at = new Date().toISOString();
            return doc.on;
        });

        return { on: captured };
    } catch {
        // A refused commit stores no record. The route still answers, with the current setting.
        return { on: defaultOn() };
    }
}

async function toggleFromRoute(request: ConversationWebRequest, web: Web): Promise<{ on: boolean }> {
    const state = await toggleMode(request.commit, request.conversation.id, request.user);
    publishChange(web, request.conversation.id);
    return { on: state.on };
}

function installCommand(web: Web): void {
    web.command("orchestrator-mode", {
        description: "Toggle read-only orchestration for this conversation",
        scope: "conversation",
        handler: async (_args, context) => {
            if (!isSession(context.user.id, context.conversationId)) {
                return {
                    type: "toast",
                    level: "warning",
                    message: "Orchestrator mode applies to the main session. Nothing changed.",
                };
            }

            const state = await toggleMode(context.commit, context.conversationId, context.user);
            publishChange(web, context.conversationId);
            return {
                type: "toast",
                level: "info",
                message: `Orchestrator mode ${state.on ? "on" : "off"}.`,
            };
        },
    });
}

const modeGate = hook(ToolTask, {
    beforeTool: async (call, api, context) => {
        // ToolTask supplies this runtime even though HookApi omits agent from its public type. Read it once per call.
        const runtime = api as typeof api & Partial<Pick<ToolExecutionApi, "agent">>;
        const agent = await runtime.agent?.(context);
        if (isSubagentConversation(api.conversationId, agent)) {
            return undefined;
        }

        if (!isOn(await api.snapshot(OrchestratorModeDoc, api.conversationId, context))) {
            return undefined;
        }

        const args = (call.arguments ?? {}) as Record<string, unknown>;
        const blocked = (): { block: string } => ({
            block: blockedToolMessage(call.name),
        });

        if (isBlockedByMode(call.name)) {
            return blocked();
        }

        if (call.name === "background") {
            return args.action === "start" ? blocked() : undefined;
        }

        if (call.name === "subagent" && args.action === "spawn") {
            const tools = args.tools;
            if (tools === undefined || (Array.isArray(tools) && tools.length === 0)) {
                return { block: blockedSpawnGrantMessage() };
            }
        }

        if (ALLOWED_TOOLS.has(call.name)) {
            return undefined;
        }

        // The predicate fails closed for built-ins; only a non-built-in tool reaches this read-only check.
        const tool = agent?.tools.find((candidate) => candidate.name === call.name) as
            | { annotations?: { readOnlyHint?: boolean } }
            | undefined;

        return tool?.annotations?.readOnlyHint === true ? undefined : blocked();
    },
});

export default function createOrchestratorMode(host: Host, web: Web) {
    // The sections, wraps, and hooks read the owner setting through this reference.
    currentWeb = web;

    // web.settings is experimental since Pi Pocket 0.22.0, so an older host loads the module without the setting.
    if (typeof web.settings === "function") {
        declareDefaultOnSetting(web);
    }

    // host.on is experimental since Pi Pocket 0.22.0, so the module works without it: the instructions prefix answers
    // alone when the listener is absent.
    if (typeof host.on === "function") {
        web.onDispose(
            host.on("run.started", ({ conversationId, session }) => {
                if (conversationId !== session) {
                    rememberSubagentConversation(conversationId);
                }
            }),
        );
    }

    web.client("orchestrator-mode");

    web.route("GET", "session/:id", readSession, { access: "view" });
    web.conversationRoute("GET", "mode/:conversationId", readMode, { conversation: "conversationId" });
    web.conversationRoute(
        "POST",
        "mode/:conversationId",
        (request) => toggleFromRoute(request, web),
        { conversation: "conversationId" },
    );
    installCommand(web);

    return defineExtension({
        name: "orchestrator-mode",
        sections: [orchestratorSection],
        wraps: [deferredToolsOffer, codemodeOffer],
        hooks: [modeGate],
    });
}
