/** Read-only orchestration mode: read context and delegate work without changing files in the orchestrator. */
import { defineDoc, defineExtension, hook, section, ToolTask } from "@earendil-works/pi-durable";
import type { ToolExecutionApi } from "@earendil-works/pi-durable";
import type { CommandContext, ConversationWebRequest, Host, Web } from "./_pocket.d.ts";

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
    initial: () => ({ on: false, by: { id: "", name: "" }, at: "" }),
    checkpointWhen: () => false,
});

const ALLOWED_TOOLS = new Set([
    "read",
    "subagent",
    "ask",
    "tool_search",
    "codemode",
    "artifact",
    "artifact_inline",
    "sessions",
    "session_read",
    "design_preview",
    "secrets_list",
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
    "schedule",
    "watch_pr",
    "repo_watch",
    "session_watch_pr",
    "memory",
    "approvals",
    "ask_someone",
    "secret_request",
    "secret_save",
    "design_export",
    "design_system",
]);

// Pi core and Pi Pocket built-in tool names. Keep this inventory aligned with the host's BUILT_IN_TOOLS set.
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

const ORCHESTRATOR_PROMPT = `Read the relevant context first, then delegate work to subagents. Never change files yourself. Set the tools of each child explicitly, and state in every brief whether it may change files and which paths it may touch. Never give two children the same file to change. Chain work on one file, or on one folder, one child at a time.

Plan the work as a graph of steps with dependencies before you delegate anything, and show the steps to the person. Send independent steps in one batch. Send a dependent step only after the steps it needs have finished and you have checked their result. Stop splitting a step once a sub-step needs another child's result. When a step fails, a fact contradicts the plan, or new required work appears, re-plan and say what changed. Never widen the request to fit the plan.

Each brief gives the role, the steps in order, the exact paths and names, the limits, and how you will judge the result. Write each brief to a subagent in ASD-STE100 and ask for its report in the same style. Check each result yourself with read. When a child claims a test or command result you cannot repeat, spawn one independent verifier, and never verify a verifier. If a child fails, read the error and change the brief, then retry once. Continue a partial result instead of restarting it. Carry decisions and findings into later briefs; do not pass a bare path and expect the child to know why. Ask each child for paths, short excerpts, and findings, never a file dump.

Answer the person in normal English, reducing the reports into a clear answer and naming the changed files. Never say a step passed when it was not run.`;

const orchestratorSection = section("orchestrator_mode", async (input, context) =>
    (await input.read.snapshot(OrchestratorModeDoc, input.conversationId, context))?.on === true
        ? ORCHESTRATOR_PROMPT
        : undefined,
);

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
    return { on: state?.on === true };
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
        if ((await api.snapshot(OrchestratorModeDoc, api.conversationId, context))?.on !== true) {
            return undefined;
        }

        const args = (call.arguments ?? {}) as Record<string, unknown>;
        const blocked = (): { block: string } => ({
            block: `Orchestrator mode is on: ${call.name} is blocked. Delegate the work to a subagent.`,
        });

        if (EXPLICITLY_BLOCKED_TOOLS.has(call.name)) {
            return blocked();
        }

        if (call.name === "background") {
            return args.action === "start" ? blocked() : undefined;
        }

        if (ALLOWED_TOOLS.has(call.name)) {
            return undefined;
        }

        // Built-ins fail closed; only non-built-in tools can grant access with readOnlyHint.
        if (BUILT_IN_TOOL_NAMES.has(call.name)) {
            return blocked();
        }

        // ToolTask supplies this runtime even though HookApi omits agent from its public type.
        const runtime = api as typeof api & Partial<Pick<ToolExecutionApi, "agent">>;
        const tool = (await runtime.agent?.(context))?.tools.find((candidate) => candidate.name === call.name) as
            | { annotations?: { readOnlyHint?: boolean } }
            | undefined;

        return tool?.annotations?.readOnlyHint === true ? undefined : blocked();
    },
});

export default function createOrchestratorMode(_host: Host, web: Web) {
    web.client("orchestrator-mode");

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
        hooks: [modeGate],
    });
}
