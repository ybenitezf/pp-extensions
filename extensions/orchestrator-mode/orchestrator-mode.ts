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

// The read path carries the default: a conversation with no stored state is in the mode (design D1).
function isOnByState(state: ModeState | undefined): boolean {
    return state?.on !== false;
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

// The prefix is the text that Pi Pocket writes in /app/src/server/extensions/subagents.ts when it makes a child.
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

const ORCHESTRATOR_PROMPT = `Read the relevant context first, then delegate work to subagents. Never change files yourself. Set the tools of each child explicitly, and state in every brief whether it may change files and which paths it may touch. Never give two children the same file to change. Chain work on one file, or on one folder, one child at a time.

Plan the work as a graph of steps with dependencies before you delegate anything, and show the steps to the person. A logical wave is the set of dependency-ready steps that you select and send together. Keep the membership of each wave and the outcome of each step in the conversation context only; do not create a persistent or runtime tracker. Send the steps of one wave in one batch. Wait for a terminal outcome from every step in the wave. A terminal outcome is any final status that a step returns, such as completion, failure, or blocker. Silence and active work are not terminal. When every outcome is in, reduce them and check each result with read before you dispatch another wave. Record failures or new evidence, but keep the wave barrier: do not dispatch a step of a later wave early. After every wave, audit every pending step and dependency for need, work and acceptance criteria, dependencies, and readiness. Preserve completed steps and their results, and preserve the original request scope. Change pending work only when evidence materially affects it; otherwise state that the remaining graph is unchanged. Recompute the future waves after any change. Before the next dispatch, show a concise diff of added, removed, or changed steps and edges, the reason for each change, and the next wave. For an unchanged graph, state that and show the next wave. The diff and next-wave summary must never include a concurrent-call count, in any wording. Pause and ask the person before work would alter or expand the request. Send a dependent step only after the steps it needs have finished and you have checked their result. Stop splitting a step once a sub-step needs another child's result. When a step fails, a fact contradicts the plan, or new required work appears, re-plan and say what changed. Never widen the request to fit the plan.

Each brief gives the role, the steps in order, the exact paths and names, the limits, and how you will judge the result. Write each brief to a subagent in ASD-STE100 and ask for its report in the same style. Check each result yourself with read. When a child claims a test or command result you cannot repeat, spawn one independent verifier, and never verify a verifier. If a child fails, read the error and change the brief, then retry once. Continue a partial result instead of restarting it. Carry decisions and findings into later briefs; do not pass a bare path and expect the child to know why. Ask each child for paths, short excerpts, and findings, never a file dump.

Answer the person in normal English, reducing the reports into a clear answer and naming the changed files. Never say a step passed when it was not run.

Orchestrator mode offers read-only tools only, and a step that needs another tool goes into the tools grant of a subagent.`;

const orchestratorSection = section("orchestrator_mode", async (input, context) => {
    if (isSubagentConversation(input.conversationId, input.agent)) {
        return undefined;
    }

    const state = await input.read.snapshot(OrchestratorModeDoc, input.conversationId, context);
    return isOnByState(state) ? ORCHESTRATOR_PROMPT : undefined;
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
            if (!isOnByState(state)) {
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
        state.on = !state.on;
        state.by = { id: actor.id, name: actor.name };
        state.at = new Date().toISOString();
        return { on: state.on, by: state.by, at: state.at };
    });
}

function publishChange(web: Web, conversationId: number): void {
    web.send("changed", { conversationId });
}

async function readMode(request: ConversationWebRequest): Promise<{ on: boolean }> {
    const state = await request.snapshot(OrchestratorModeDoc, request.conversation.id, request.context);
    return { on: isOnByState(state) };
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

        if (!isOnByState(await api.snapshot(OrchestratorModeDoc, api.conversationId, context))) {
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
