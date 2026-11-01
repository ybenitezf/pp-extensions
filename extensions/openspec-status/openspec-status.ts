/**
 * Shows OpenSpec state in a status item and a panel.
 * It runs `git rev-parse --show-toplevel` and `openspec status --all --json` itself, read-only; Lancet Guard does not see them.
 */
import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { defineExtension, hook, ToolTask } from "@earendil-works/pi-durable";
import type { HookRegistration } from "@earendil-works/pi-durable";
import type { ConversationWebRequest, Host, Web } from "./_pocket.d.ts";

const extensionName = "openspec-status";

const neededPocket = "Pi Pocket 0.26.0";

/** Time limits for the 2 read-only commands. */
const gitTimeoutMs = 5_000;
const readingTimeoutMs = 10_000;

/**
 * A folder without a project is asked again at the next reading, so a new `openspec/` folder is seen while the session is open.
 */
const projectRoots = new Map<string, string>();

function missingServerAdditions(host: Host, web: Web): string[] {
    const missing: string[] = [];
    if (typeof web.conversationRoute !== "function") {
        missing.push("web.conversationRoute");
    }
    if (typeof host.on !== "function") {
        missing.push("host.on");
    }
    return missing;
}

const routePath = "status/:source";
const routeSource = "source";
const browserEntry = extensionName;

const commandNames = ["git", "openspec"] as const;

type CommandName = (typeof commandNames)[number];

/** The result of one command run; a failed run does not throw. */
export interface CommandRun {
    readonly command: CommandName;
    readonly args: readonly string[];
    readonly code: number | null;
    readonly stdout: string;
    readonly stderr: string;
    readonly trouble: CommandTrouble | null;
}

/** The kind of trouble that prevents a command from returning an exit code. */
export type CommandTroubleKind = "not-found" | "timeout" | "failed";

/** A command failure, in words for a person. */
export interface CommandTrouble {
    readonly kind: CommandTroubleKind;
    readonly words: string;
}

interface CommandOptions {
    readonly cwd: string;
    readonly timeoutMs: number;
}

interface RunError {
    readonly code?: unknown;
    readonly killed?: unknown;
    readonly message?: unknown;
}

/** A missing command or timeout is trouble; a non-zero exit is left to the caller. */
function describeTrouble(command: CommandName, timeoutMs: number, error: RunError): CommandTrouble | null {
    if (error.code === "ENOENT") {
        return { kind: "not-found", words: `${command} command not found on this machine (ENOENT)` };
    }
    if (error.killed === true) {
        return {
            kind: "timeout",
            words: `${command} command did not answer within ${timeoutMs} ms, so it was stopped`,
        };
    }
    if (typeof error.code === "number") {
        return null;
    }
    const reason = typeof error.message === "string" && error.message !== "" ? `: ${error.message}` : "";
    return { kind: "failed", words: `${command} command did not run${reason}` };
}

/**
 * Runs one command without a shell, so no folder name or change name can become a second command. It never throws.
 */
async function runCommand(command: CommandName, args: readonly string[], options: CommandOptions): Promise<CommandRun> {
    const words = [...args];
    return await new Promise<CommandRun>((resolve) => {
        execFile(
            command,
            words,
            { cwd: options.cwd, timeout: options.timeoutMs, windowsHide: true, encoding: "utf8", shell: false },
            (error, stdout, stderr) => {
                const out = typeof stdout === "string" ? stdout : "";
                const err = typeof stderr === "string" ? stderr : "";
                if (error === null) {
                    resolve({ command, args: words, code: 0, stdout: out, stderr: err, trouble: null });
                    return;
                }
                const failure = error as RunError;
                const code = failure.code;
                resolve({
                    command,
                    args: words,
                    code: typeof code === "number" ? code : null,
                    stdout: out,
                    stderr: err,
                    trouble: describeTrouble(command, options.timeoutMs, failure),
                });
            },
        );
    });
}

/** Runs `openspec status --all --json`; exit code 0 does not prove that the folder is an OpenSpec project. */
export async function openSpecStatus(cwd: string): Promise<CommandRun> {
    return await runCommand("openspec", ["status", "--all", "--json"], { cwd, timeoutMs: readingTimeoutMs });
}

async function holdsOpenSpecChanges(folder: string): Promise<boolean> {
    try {
        const found = await stat(join(folder, "openspec", "changes"));
        return found.isDirectory();
    } catch {
        return false;
    }
}

async function gitTopLevel(folder: string): Promise<string | null> {
    const run = await runCommand("git", ["rev-parse", "--show-toplevel"], { cwd: folder, timeoutMs: gitTimeoutMs });
    if (run.trouble !== null || run.code !== 0) {
        return null;
    }
    const top = run.stdout.trim();
    return top === "" ? null : top;
}

/**
 * Finds the project root, or `null`. The result is cached per session folder, but a folder without a project is not cached.
 */
export async function findProjectRoot(cwd: string): Promise<string | null> {
    const kept = projectRoots.get(cwd);
    if (kept !== undefined) {
        return kept;
    }
    if (await holdsOpenSpecChanges(cwd)) {
        projectRoots.set(cwd, cwd);
        return cwd;
    }
    const top = await gitTopLevel(cwd);
    if (top === null || top === cwd || !(await holdsOpenSpecChanges(top))) {
        return null;
    }
    projectRoots.set(cwd, top);
    return top;
}

/** An artifact and the status returned by the CLI. */
export interface ReadingArtifact {
    readonly id: string;
    readonly status: string;
}

/** A `##` group from `tasks.md` with its task counts. */
export interface ReadingTaskGroup {
    readonly title: string;
    readonly done: number;
    readonly total: number;
}

/** Task counts and groups from a change's `tasks.md`. */
export interface ReadingTasks {
    readonly done: number;
    readonly total: number;
    readonly groups: readonly ReadingTaskGroup[];
}

/** An active change with its artifacts, apply requirements, and task counts. */
export interface ReadingChange {
    readonly name: string;
    readonly schema: string;
    readonly artifacts: readonly ReadingArtifact[];
    readonly apply: readonly string[];
    readonly tasks: ReadingTasks;
}

/** Why a reading has no project or change. */
export interface ReadingError {
    readonly kind: "not-found" | "failed";
    readonly message: string;
}

/** The reading returned to the browser part. */
export interface OpenSpecReading {
    readonly project: string | null;
    readonly changes: readonly ReadingChange[];
    readonly at: string;
    readonly error: ReadingError | null;
}

/** Limits for large `tasks.md` files. */
const maxTaskGroups = 200;
const maxCheckboxLinesPerGroup = 1_000;

const maxMessageLength = 500;

const groupHeadingStart = "## ";
const checkboxLine = /^\s*- \[([ xX])\](?:\s|$)/;

function shorten(text: string): string {
    return text.length <= maxMessageLength ? text : `${text.slice(0, maxMessageLength)}…`;
}

/**
 * Counts `- [x]` and `- [ ]` lines under `##` headings. A `###` heading does not open a group, and empty groups are omitted.
 * It reads at most 200 groups and 1,000 checkbox lines per group.
 */
export function parseTaskGroups(text: string): ReadingTasks {
    const groups: ReadingTaskGroup[] = [];
    let open: { title: string; done: number; total: number } | null = null;
    let opened = 0;
    let done = 0;
    let total = 0;

    const close = (): void => {
        if (open === null) {
            return;
        }
        if (open.total > 0) {
            groups.push({ title: open.title, done: open.done, total: open.total });
            done += open.done;
            total += open.total;
        }
        open = null;
    };

    for (const line of text.split(/\r?\n/)) {
        if (line.startsWith(groupHeadingStart)) {
            close();
            if (opened < maxTaskGroups) {
                opened += 1;
                open = { title: line.slice(groupHeadingStart.length).trim(), done: 0, total: 0 };
            }
            continue;
        }
        if (open === null || open.total >= maxCheckboxLinesPerGroup) {
            continue;
        }
        const found = checkboxLine.exec(line);
        if (found === null) {
            continue;
        }
        open.total += 1;
        if (found[1] !== " ") {
            open.done += 1;
        }
    }
    close();

    return { done, total, groups };
}

function asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === "object" && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

function textOf(value: unknown, fallback: string): string {
    return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

function listOf(value: unknown): readonly unknown[] {
    return Array.isArray(value) ? value : [];
}

function textsOf(value: unknown): readonly string[] {
    return listOf(value).filter((item): item is string => typeof item === "string");
}

/** Rejects names that could escape the project path. */
function isFolderName(name: string): boolean {
    return name !== "" && name !== "." && name !== ".." && !name.includes("/") && !name.includes("\\");
}

/** The CLI has no task counts, so a missing or unreadable `tasks.md` answers `0/0` with no groups. */
async function readTaskCounts(projectRoot: string, name: string): Promise<ReadingTasks> {
    const file = join(projectRoot, "openspec", "changes", name, "tasks.md");
    try {
        return parseTaskGroups(await readFile(file, "utf8"));
    } catch {
        return { done: 0, total: 0, groups: [] };
    }
}

function troubleWords(run: CommandRun): string {
    const stderr = run.stderr.trim();
    if (stderr !== "") {
        return shorten(stderr);
    }
    const stdout = run.stdout.trim();
    if (stdout !== "") {
        return shorten(stdout);
    }
    return `${run.command} ${run.args.join(" ")} exited with code ${run.code === null ? "none" : String(run.code)}`;
}

function firstWords(run: CommandRun): string {
    const words = run.stdout.trim() !== "" ? run.stdout.trim() : run.stderr.trim();
    const firstLine = words.split(/\r?\n/, 1)[0];
    return shorten(firstLine === "" ? "nothing was written" : firstLine);
}

function failedReading(at: string, kind: ReadingError["kind"], message: string): OpenSpecReading {
    return { project: null, changes: [], at, error: { kind, message } };
}

/** Reads OpenSpec status and task counts; `root.source` distinguishes no project from an empty project. */
export async function readOpenSpecStatus(folder: string): Promise<OpenSpecReading> {
    const run = await openSpecStatus(folder);
    const at = new Date().toISOString();

    if (run.trouble !== null) {
        return failedReading(at, run.trouble.kind === "not-found" ? "not-found" : "failed", shorten(run.trouble.words));
    }
    if (run.code !== 0) {
        return failedReading(at, "failed", troubleWords(run));
    }

    let answer: Record<string, unknown> | null;
    try {
        answer = asRecord(JSON.parse(run.stdout) as unknown);
    } catch {
        answer = null;
    }
    if (answer === null) {
        return failedReading(at, "failed", `openspec status answered no JSON: ${firstWords(run)}`);
    }

    const root = asRecord(answer.root);
    const source = root === null ? undefined : root.source;
    if (source !== "nearest" && source !== "implicit") {
        return failedReading(at, "failed", "openspec status answered no root.source, so the reading is unclear");
    }
    if (source === "implicit") {
        return { project: null, changes: [], at, error: null };
    }

    const project = textOf(root?.path, folder);
    const changes: ReadingChange[] = [];
    for (const entry of listOf(answer.changes)) {
        const change = asRecord(entry);
        if (change === null) {
            continue;
        }
        const name = textOf(change.changeName, "");
        if (!isFolderName(name)) {
            continue;
        }
        const artifacts: ReadingArtifact[] = [];
        for (const item of listOf(change.artifacts)) {
            const artifact = asRecord(item);
            const id = textOf(artifact?.id, "");
            if (id === "") {
                continue;
            }
            artifacts.push({ id, status: textOf(artifact?.status, "ready") });
        }
        changes.push({
            name,
            schema: textOf(change.schemaName, ""),
            artifacts,
            apply: textsOf(change.applyRequires),
            tasks: await readTaskCounts(project, name),
        });
    }

    return { project, changes, at, error: null };
}

const cacheWindowMs = 2_000;


interface CachedReading {
    readonly answer: OpenSpecReading;
    readonly good: OpenSpecReading | null;
    readonly timeMs: number;
}

/** Sessions in the same project share a good reading for 2 seconds. A failed reading is not reused: it keeps the last good data. */
const readingCache = new Map<string, CachedReading>();
async function readingFor(root: string): Promise<OpenSpecReading> {
    const nowMs = Date.now();
    const kept = readingCache.get(root);
    if (kept !== undefined && kept.answer.error === null && nowMs - kept.timeMs < cacheWindowMs) {
        return kept.answer;
    }
    const fresh = await readOpenSpecStatus(root);
    const good = fresh.error === null ? fresh : kept?.good ?? null;
    const answer = fresh.error === null || good === null ? fresh : { ...good, error: fresh.error };
    readingCache.set(root, { answer, good, timeMs: nowMs });
    return answer;
}

/** A non-project folder returns `project: null` and `changes: []` without an error. */
async function answerStatus(request: ConversationWebRequest): Promise<OpenSpecReading> {
    const at = new Date().toISOString();
    const root = await findProjectRoot(request.conversation.cwd);
    if (root === null) {
        return { project: null, changes: [], at, error: null };
    }
    return await readingFor(root);
}

const nudgeDelayMs = 500;

const changedEvent = "changed";

/** The conversation whose OpenSpec reading may be new. */
export interface ChangedEvent {
    readonly conversationId: number;
}

const fileTools: readonly string[] = ["write", "edit"];

const commandTool = "bash";

/** Pending debounce timers, one per conversation. */
const pendingNudges = new Map<number, ReturnType<typeof setTimeout>>();

function isUnderOpenSpec(path: string): boolean {
    return path.split(/[\\/]+/).includes("openspec");
}

function changesOpenSpec(name: string, args: Record<string, unknown>): boolean {
    if (fileTools.includes(name)) {
        const path = args.path;
        return typeof path === "string" && isUnderOpenSpec(path);
    }
    if (name === commandTool) {
        const command = args.command;
        return typeof command === "string" && command.includes("openspec");
    }
    return false;
}

/** Debounces triggers per conversation before sending a `changed` event. */
function nudge(web: Web, conversationId: number): void {
    const pending = pendingNudges.get(conversationId);
    if (pending !== undefined) {
        clearTimeout(pending);
    }
    pendingNudges.set(
        conversationId,
        setTimeout(() => {
            pendingNudges.delete(conversationId);
            web.send(changedEvent, { conversationId } satisfies ChangedEvent);
        }, nudgeDelayMs),
    );
}

function stopNudges(): void {
    for (const timer of pendingNudges.values()) {
        clearTimeout(timer);
    }
    pendingNudges.clear();
}

/** Watches completed runs and tool calls; the hook is read-only and blocks nothing. */
function installTriggers(host: Host, web: Web): readonly HookRegistration[] {
    const stopRunEnded = host.on("run.ended", ({ conversationId }) => {
        nudge(web, conversationId);
    });

    const toolHook = hook(ToolTask, {
        afterTool: (call, _result, api) => {
            const args = (call.arguments ?? {}) as Record<string, unknown>;
            if (changesOpenSpec(call.name, args)) {
                nudge(web, api.conversationId);
            }
            return undefined;
        },
    });

    web.onDispose(stopRunEnded);
    web.onDispose(stopNudges);

    return [toolHook];
}

/** Creates the extension. */
export default function createExtension(host: Host, web: Web): ReturnType<typeof defineExtension> {
    const missing = missingServerAdditions(host, web);
    if (missing.length > 0) {
        host.notice(
            "warning",
            `${extensionName} needs ${neededPocket}, and this app does not have ${missing.join(" and ")}. The module did nothing.`,
        );
        return defineExtension({ name: extensionName });
    }

    web.client(browserEntry);

    web.conversationRoute("GET", routePath, answerStatus, { conversation: routeSource });

    return defineExtension({ name: extensionName, hooks: installTriggers(host, web) });
}
