/**
 * Shows the state of the OpenSpec project that the session's folder holds: the active changes, their artifact states,
 * and their task progress, as a status item under the message box and as a panel beside the conversation.
 *
 * What it runs: `git rev-parse --show-toplevel` to find the session's project root, then `openspec status --all --json`
 * there, both read-only, through 1 command runner: `execFile` with an argument array and no shell. Lancet Guard does not
 * see those commands. It needs the `git` and `openspec` commands on this machine, and it says "not found" when
 * `openspec` is absent.
 *
 * What it needs: Pi Pocket 0.26.0: a status item and a panel in the browser part, `web.conversationRoute` (0.16.0) for
 * the reading, and `host.on` (0.22.0, experimental) for the triggers.
 *
 * The browser part is the folder `openspec-status/` beside this file: it draws, and this file reads.
 */
import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { defineExtension, hook, ToolTask } from "@earendil-works/pi-durable";
import type { HookRegistration } from "@earendil-works/pi-durable";
import type { ConversationWebRequest, Host, Web } from "./_pocket.d.ts";

// The names of this module. They are here, in one place, so that a copy is easy to rename.
const extensionName = "openspec-status";

// The oldest Pi Pocket that this module works with: `web.conversationRoute` and `host.on` came before it, and the
// status item and the panel of the browser part came in 0.19.0 as experimental members.
const neededPocket = "Pi Pocket 0.26.0";

/**
 * The 2 additions of the server API that this module uses, in the order in which it needs them: the route that gives 1
 * reading for 1 conversation (task 2.5), and the event that says when Pi stopped working (task 2.6).
 *
 * `web.client` and `web.send` are not here: they came in 0.14.0, the oldest API level that Pi Pocket loads (level 1).
 * `pocket.status` and `pocket.panel` are the browser part's checks, not the server's: they are in
 * `openspec-status/index.js` (task 3.1), where `pocket` is.
 */
const serverAdditions = ["web.conversationRoute", "host.on"] as const;

/**
 * The limits of the commands that this module runs, in milliseconds, and the 2 limits of task 2.3: `git rev-parse` reads
 * 1 path on a local disk and `openspec --version` prints 1 line, so each gets 5 seconds; a reading walks the project's
 * changes and their files, so it gets 10 seconds.
 */
const gitTimeoutMs = 5_000;
const versionTimeoutMs = 5_000;
const readingTimeoutMs = 10_000;

/**
 * The OpenSpec project root that each session folder resolved to (decision 4 of the change's `design.md`).
 *
 * Only a folder that holds a project goes in: a folder without one is asked again at its next reading, so a person who
 * adds `openspec/` while the session is open is seen at once, and the map cannot grow past the folders that have 1.
 */
const projectRoots = new Map<string, string>();

/** 1 member of the server API that this module uses. */
type ServerAddition = (typeof serverAdditions)[number];

/** The host and web of 1 load, as the check reads them: a type that is narrower than what the app gives. */
interface ServerApi {
    readonly host: Host;
    readonly web: Web;
}

/**
 * Tells whether 1 addition is on this server (task 2.1).
 *
 * The documented check for an addition is a run-time one, `typeof web.command === "function"` (policy A10 in
 * `docs/extensions/policies/api-stability.md`). The `api` number cannot serve here: an addition does not change it
 * (policy A8). A server that restarted keeps the host that it had while a module loads again, so the check runs on every
 * load, before anything is installed.
 */
function hasAddition(api: ServerApi, addition: ServerAddition): boolean {
    switch (addition) {
        case "web.conversationRoute":
            return typeof api.web.conversationRoute === "function";
        case "host.on":
            return typeof api.host.on === "function";
    }
}

/**
 * The server-side feature checks: the additions that are missing on this server, in the order of `serverAdditions`.
 *
 * The browser part does its own check of `pocket.status` and `pocket.panel`, so this file never looks at `pocket`.
 */
function missingServerAdditions(api: ServerApi): readonly ServerAddition[] {
    return serverAdditions.filter((addition) => !hasAddition(api, addition));
}

/**
 * The names that this module registers with Pi Pocket: the 1 route `GET status/:source` and the folder of the browser
 * part, which is the name of this module beside this file (task 2.5 and task 3.1).
 */
const routePath = "status/:source";
const routeSource = "source";
const browserEntry = extensionName;

/** The 2 commands that this module runs: `git` to find the project root, and `openspec` to read the project. */
const commandNames = ["git", "openspec"] as const;

/** 1 command that this module runs. */
type CommandName = (typeof commandNames)[number];

/**
 * What 1 run of 1 command answered: its exit code, its 2 streams as it wrote them, and the reason when it did not run at
 * all (task 2.3).
 *
 * A run never throws. A command that is not on this machine answers `code: null` and a `problem` with the words
 * "not found" in it, so the status item can say what the spec asks for the case in which the command is not installed.
 */
export interface CommandRun {
    /** The command that was asked for. */
    readonly command: CommandName;
    /** The words after the command name, apart: no shell ever sees them, and no folder name can become a command. */
    readonly args: readonly string[];
    /** The exit code of the command, or `null` when it did not run to an exit. */
    readonly code: number | null;
    /** What the command wrote on its standard output. */
    readonly stdout: string;
    /** What the command wrote on its standard error. */
    readonly stderr: string;
    /** Why the command did not run, in words for a person, or `""` when it ran and gave an exit code. */
    readonly problem: string;
}

/** How long 1 run may take, and the folder that it runs in. */
interface CommandOptions {
    /** The folder that the command runs in. */
    readonly cwd: string;
    /** The longest run, in milliseconds, before the command is stopped. */
    readonly timeoutMs: number;
}

/** The parts of the error that `execFile` gives, as this file reads them: `code` is a number or a text such as `ENOENT`. */
interface RunError {
    readonly code?: unknown;
    readonly killed?: unknown;
    readonly message?: unknown;
}

/**
 * The reason that 1 command did not run, in words for a person, or `""` when it ran and gave an exit code (task 2.3).
 *
 * A command that this machine does not hold gives the words "not found", with the `ENOENT` that `execFile` reported: that
 * answer is not a throw, and it is what the status item says. A command that ran past its limit names the limit. A
 * non-zero exit is no problem here: the command ran, its own words are in `stderr`, and the caller decides what they mean.
 */
function describeTrouble(command: CommandName, timeoutMs: number, error: RunError): string {
    if (error.code === "ENOENT") {
        return `${command} command not found on this machine (ENOENT)`;
    }
    if (error.killed === true) {
        return `${command} command did not answer within ${timeoutMs} ms, so it was stopped`;
    }
    if (typeof error.code === "number") {
        return "";
    }
    const reason = typeof error.message === "string" && error.message !== "" ? `: ${error.message}` : "";
    return `${command} command did not run${reason}`;
}

/**
 * The 1 command runner of this module (task 2.3): it runs 1 command with its words apart, in 1 folder, within 1 limit, and
 * answers 1 `CommandRun`.
 *
 * It never uses a shell: `execFile` takes the words apart, and `shell` is off, so no folder name and no change name can
 * grow into a second command. It never throws: a command that is absent, too slow, or gone gives an answer with a
 * `problem`.
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
                    resolve({ command, args: words, code: 0, stdout: out, stderr: err, problem: "" });
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
                    problem: describeTrouble(command, options.timeoutMs, failure),
                });
            },
        );
    });
}

/**
 * The version check: `openspec --version` in 1 folder, within 5 seconds (task 2.3). It tells whether this machine holds
 * the command, and which version, which the panel shows while a reading fails. Exported so that a check can run it
 * without a live session.
 */
export async function openSpecVersion(cwd: string): Promise<CommandRun> {
    return await runCommand("openspec", ["--version"], { cwd, timeoutMs: versionTimeoutMs });
}

/**
 * The 1 reading: `openspec status --all --json` in the project root, within 10 seconds (decision 2; task 2.4 parses the
 * `stdout`). Exported so that a check can run it without a live session.
 *
 * The exit code says nothing about the folder: a folder that is no OpenSpec project exits 0 too, with
 * `root.source === "implicit"` in the JSON (decision 4, and the addendum of the design).
 */
export async function openSpecStatus(cwd: string): Promise<CommandRun> {
    return await runCommand("openspec", ["status", "--all", "--json"], { cwd, timeoutMs: readingTimeoutMs });
}

/** Tells whether 1 folder holds `openspec/changes/`; that folder is what makes a folder an OpenSpec project (task 2.2). */
async function holdsOpenSpecChanges(folder: string): Promise<boolean> {
    try {
        const found = await stat(join(folder, "openspec", "changes"));
        return found.isDirectory();
    } catch {
        return false;
    }
}

/**
 * Asks git for the top level of the repository that 1 folder is in, and gives `null` when there is none: no git, no
 * repository, or a git that failed all answer `null`, so nothing throws (task 2.2).
 *
 * This is the named `git` caller of the 1 command runner (task 2.3), so `git` and `openspec` stay apart as 2 callers of 1
 * runner: the runner takes the words apart, and no folder name can become a command.
 */
async function gitTopLevel(folder: string): Promise<string | null> {
    const run = await runCommand("git", ["rev-parse", "--show-toplevel"], { cwd: folder, timeoutMs: gitTimeoutMs });
    if (run.problem !== "" || run.code !== 0) {
        return null;
    }
    const top = run.stdout.trim();
    return top === "" ? null : top;
}

/**
 * The OpenSpec project root of 1 session folder: the folder itself when it holds `openspec/changes/`, else the top level
 * of its git repository when that holds it, else `null` (task 2.2, decision 4 of the change's `design.md`).
 *
 * The answer is kept per folder, so 2 tabs of 1 session, and a poll every 30 seconds, ask git once. It is exported so
 * that a check can call it without a live session.
 *
 * This is the rule for finding the root. The reading of task 2.4 tells the "not a project" case apart from a project with
 * no active change with `root.source` of the CLI's JSON: `"implicit"` is no `openspec/` folder found, `"nearest"` is 1
 * found. The exit code is `0` in all 3 cases, so it says nothing here, and an empty `changes` list is not "no project".
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
    // `top === cwd` is a folder that this function has just found no `openspec/changes/` in, so it is no project either.
    if (top === null || top === cwd || !(await holdsOpenSpecChanges(top))) {
        return null;
    }
    projectRoots.set(cwd, top);
    return top;
}

// ─── The reading (task 2.4) ─────────────────────────────────────────────────────────────

/**
 * 1 artifact of 1 active change, as the panel marks it: `id` names it, and `status` is what the CLI answered, `done`,
 * `ready`, or `blocked`.
 */
export interface ReadingArtifact {
    /** The artifact's name, such as `proposal`, `specs`, `design`, or `tasks`. */
    readonly id: string;
    /** The CLI's word for the artifact's state. */
    readonly status: string;
}

/** The 1 `##` group of 1 change's `tasks.md` with its own counter. */
export interface ReadingTaskGroup {
    /** The heading's text after `## `, such as `1. Confirm what the CLI answers`. */
    readonly title: string;
    /** The group's `- [x]` lines. */
    readonly done: number;
    /** The group's checkbox lines, done and not done. */
    readonly total: number;
}

/** The tasks of 1 active change: the groups of its `tasks.md`, and their sum. */
export interface ReadingTasks {
    /** The sum of the groups' `done`. */
    readonly done: number;
    /** The sum of the groups' `total`. */
    readonly total: number;
    /** The groups of `tasks.md` that hold a checkbox line, in the file's order. */
    readonly groups: readonly ReadingTaskGroup[];
}

/** 1 active change of the project, as the status item and the panel show it. */
export interface ReadingChange {
    /** The change's folder name, such as `add-openspec-status`. */
    readonly name: string;
    /** The change's schema, such as `spec-driven`. */
    readonly schema: string;
    /** 1 mark for each artifact, in the CLI's order. */
    readonly artifacts: readonly ReadingArtifact[];
    /** What applying the change needs, the CLI's `applyRequires`. */
    readonly apply: readonly string[];
    /** The task counter and the groups, from the change's `tasks.md`. */
    readonly tasks: ReadingTasks;
}

/** The OpenSpec project that 1 folder answered: its root, and how the CLI found it. */
export interface ReadingProject {
    /** The absolute path of the project root, the CLI's `root.path`. */
    readonly root: string;
    /** `nearest` is an `openspec/` folder that was found, `implicit` is none found (decision 4 and the design's addendum). */
    readonly source: "nearest" | "implicit";
}

/** Why 1 reading answered no project and no change. */
export interface ReadingError {
    /** `not-found` is the `openspec` command that this machine does not hold, `failed` is every other trouble. */
    readonly kind: "not-found" | "failed";
    /** The command's own words, or words that name what came back instead of JSON. */
    readonly message: string;
}

/**
 * What 1 reading answers: the contract that the route of task 2.5 gives the browser part, and that the status item and
 * the panel of task 3 draw.
 *
 * The 3 cases stay apart: `project: null` and `changes: []` is a folder that is no OpenSpec project; a project with
 * `changes: []` is a project that holds no active change; a project with changes is the usual case.
 */
export interface OpenSpecReading {
    /** The project, or `null` when the folder and its git root hold no `openspec/` folder. */
    readonly project: ReadingProject | null;
    /** 1 entry for each active change, and `[]` when the project holds none. */
    readonly changes: readonly ReadingChange[];
    /** The time of this reading, as ISO 8601, so that the panel can say how old it is. */
    readonly at: string;
    /** Why the reading holds no change, or `null` when the reading is good. */
    readonly error: ReadingError | null;
}

/** The 2 limits that the design sets for a very large `tasks.md` (decision 10, risk list). */
const maxTaskGroups = 200;
const maxCheckboxLinesPerGroup = 1_000;

/** The longest words that 1 error message keeps, so that a whole JSON answer cannot reach the panel. */
const maxMessageLength = 500;

/** The heading that opens a task group, and the checkbox line that counts as 1 task: `- [x] 1.1 …` or `- [ ] 2.4 …`. */
const groupHeadingStart = "## ";
const checkboxLine = /^\s*- \[([ xX])\](?:\s|$)/;

/** Cuts words to the length that the panel shows. */
function shorten(text: string): string {
    return text.length <= maxMessageLength ? text : `${text.slice(0, maxMessageLength)}…`;
}

/**
 * Counts the tasks of 1 `tasks.md` by group (task 2.4, design decision 10: the parser lives in this file).
 *
 * A group is a line that starts with `## `, and a task is a line `- [x] …` or `- [ ] …`, which may wrap onto lines that
 * start with spaces: only the line with the box counts. A `###` heading does not open a group, so its boxes count into
 * the group above it. A group that holds no box is left out, which keeps a heading such as `## Workflow follow-up` out of
 * the counters. Text before the first `## ` is no group, so the change's counter is the sum of its groups.
 *
 * At most 200 groups are read and at most 1,000 box lines are counted in each group, so a very large file cannot grow the
 * reading or slow it. Exported so that a check can run it on a file without a live session.
 */
export function parseTaskGroups(text: string): ReadingTasks {
    const groups: ReadingTaskGroup[] = [];
    let open: { title: string; done: number; total: number } | null = null;
    let opened = 0;
    let done = 0;
    let total = 0;

    // A group reaches the answer when it closes: only then is its total known, and a group with no box drops out.
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
            // The limit counts every heading that opens a group, not only the groups that reach the answer.
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

/** 1 JSON object of the CLI's answer, as this file reads it; every field is checked, because the CLI can change it. */
function asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === "object" && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

/** 1 text of the CLI's answer, or `fallback` when the field is absent, empty, or not a text. */
function textOf(value: unknown, fallback: string): string {
    return typeof value === "string" && value.trim() !== "" ? value : fallback;
}

/** 1 list of the CLI's answer, and `[]` when the field is absent or not a list. */
function listOf(value: unknown): readonly unknown[] {
    return Array.isArray(value) ? value : [];
}

/** The texts of 1 list of the CLI's answer, and the fields that are no text dropped. */
function textsOf(value: unknown): readonly string[] {
    return listOf(value).filter((item): item is string => typeof item === "string");
}

/**
 * Tells whether 1 name from the CLI is 1 folder name, which it can join to the project's path: a name with a path in it,
 * such as `../other`, is no change name, and it never reaches the file system.
 */
function isFolderName(name: string): boolean {
    return name !== "" && name !== "." && name !== ".." && !name.includes("/") && !name.includes("\\");
}

/**
 * The tasks of 1 change, from `<projectRoot>/openspec/changes/<name>/tasks.md` (task 2.4).
 *
 * The CLI's JSON holds no task counter and no group, so the file is the only place that has them. A missing file, or a
 * file that cannot be read, answers `0/0` and no group: a change that is new has no tasks yet, and that is no failure.
 */
async function readTaskCounts(projectRoot: string, name: string): Promise<ReadingTasks> {
    const file = join(projectRoot, "openspec", "changes", name, "tasks.md");
    try {
        return parseTaskGroups(await readFile(file, "utf8"));
    } catch {
        return { done: 0, total: 0, groups: [] };
    }
}

/** The words that 1 failed run gives: its standard error first, then its standard output, then its exit code. */
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

/** The first line of what 1 run wrote, for the case in which the answer is no JSON. */
function firstWords(run: CommandRun): string {
    const words = run.stdout.trim() !== "" ? run.stdout.trim() : run.stderr.trim();
    const firstLine = words.split(/\r?\n/, 1)[0] ?? "";
    return shorten(firstLine === "" ? "nothing was written" : firstLine);
}

/**
 * The 1 reading of 1 folder (task 2.4): `openspec status --all --json` in the project root, parsed into the changes of
 * the project with their artifacts, their apply list, and the task counter and groups of their `tasks.md`.
 *
 * It answers the contract that the route of task 2.5 gives the browser part, and it never throws: a command that is not
 * on this machine, a command that fails, and an answer that is no JSON all end in `error`, with the command's words.
 *
 * The 3 cases of the design's addendum stay apart by `root.source`, and not by the exit code, which is `0` in all 3:
 * `"implicit"` is no `openspec/` folder found, so `project` is `null` and `changes` is `[]`; `"nearest"` with an empty
 * `changes` is a project that holds no active change, so `project` is set and `changes` is `[]`.
 *
 * Exported so that a check, and the route of task 2.5, can call it without a live tab.
 */
export async function readOpenSpecStatus(folder: string): Promise<OpenSpecReading> {
    const run = await openSpecStatus(folder);
    const at = new Date().toISOString();

    if (run.problem !== "") {
        // The runner says "not found" with the `ENOENT` that `execFile` reported, and names a limit that it stopped.
        const kind = run.problem.includes("ENOENT") ? "not-found" : "failed";
        return { project: null, changes: [], at, error: { kind, message: shorten(run.problem) } };
    }
    if (run.code !== 0) {
        return { project: null, changes: [], at, error: { kind: "failed", message: troubleWords(run) } };
    }

    let answer: Record<string, unknown> | null;
    try {
        answer = asRecord(JSON.parse(run.stdout) as unknown);
    } catch {
        answer = null;
    }
    if (answer === null) {
        return {
            project: null,
            changes: [],
            at,
            error: { kind: "failed", message: `openspec status answered no JSON: ${firstWords(run)}` },
        };
    }

    const root = asRecord(answer.root);
    const source = root === null ? undefined : root.source;
    if (source !== "nearest" && source !== "implicit") {
        // Without `root.source` the 3 cases cannot be told apart, so the reading says so instead of guessing a project.
        return {
            project: null,
            changes: [],
            at,
            error: { kind: "failed", message: "openspec status answered no root.source, so the reading is unclear" },
        };
    }
    if (source === "implicit") {
        return { project: null, changes: [], at, error: null };
    }

    const project: ReadingProject = { root: textOf(root?.path, folder), source: "nearest" };
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
            tasks: await readTaskCounts(project.root, name),
        });
    }

    return { project, changes, at, error: null };
}

// ─── The route (task 2.5) ─────────────────────────────────────────────────────────────

/** The life of 1 cached reading, in milliseconds: 2 seconds, as decision 6 of the change's `design.md` sets it. */
const cacheWindowMs = 2_000;

/**
 * What the route keeps for 1 project root (decision 6 of the change's `design.md`).
 *
 * `answer` is what the route answered last, so that a 2nd request within 2 seconds gets it again without a 2nd run of
 * the command. `good` is the last reading that had no `error`, so that a failed reading can answer with it and with its
 * own error, as the spec asks: the panel keeps the earlier numbers and marks them stale.
 */
interface CachedReading {
    /** What the route answered last for this root, and what the 2-second window gives again. */
    readonly answer: OpenSpecReading;
    /** The last reading of this root that had no `error`, or `null` when no reading of it was good. */
    readonly good: OpenSpecReading | null;
    /** When this reading was made, in milliseconds, for the 2-second window. */
    readonly timeMs: number;
}

/**
 * The readings that the route keeps, 1 for each project root: 2 tabs of 1 session, and 2 sessions in 1 folder, share 1
 * reading for 2 seconds. The key is the project root, so a session that is in a subfolder shares the reading of its
 * project with a session at its root.
 */
const readingCache = new Map<string, CachedReading>();

/**
 * The reading that the route answers for 1 project root (task 2.5; decision 6 of the change's `design.md`).
 *
 * A good reading made less than 2 seconds ago answers at once, without a 2nd run of `openspec status`.
 *
 * A reading that has `error` is never answered from the window: the next request runs the command again, so a cache of
 * failures cannot hold back a person's refresh. When a reading from before was good, the answer keeps that reading's
 * `project`, `changes`, and `at`, and puts the new `error` beside them: the panel keeps the earlier numbers, says how old
 * they are, and shows the command's words.
 */
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

/**
 * The 1 route of this module: `GET status/:source`, a `conversationRoute` with `{ conversation: "source" }` (decision 3
 * of the change's `design.md`).
 *
 * The app checks that the person may see the session before this handler runs, so the browser part sends only the
 * session's id in the path and never a folder. The handler reads the folder of that 1 session and answers the contract
 * `{ project, changes, at, error }`.
 *
 * A folder that is no OpenSpec project answers `project: null` and `changes: []` with no error and the usual status
 * code: the design's addendum shows that the CLI exits `0` for that case too, so it is no failure.
 */
async function answerStatus(request: ConversationWebRequest): Promise<OpenSpecReading> {
    const at = new Date().toISOString();
    const root = await findProjectRoot(request.conversation.cwd);
    if (root === null) {
        return { project: null, changes: [], at, error: null };
    }
    return await readingFor(root);
}

// ─── The triggers (task 2.6) ─────────────────────────────────────────────────────────────

/**
 * How long 1 conversation waits for its event, in milliseconds: 500 ms after its last trigger (decision 5 of the change's
 * `design.md`).
 *
 * 1 change of Pi can write 10 files under `openspec/`, and each write is 1 trigger. A person sees 1 new reading, so 1
 * event reaches the browser part, and the 2-second reading cache of the route absorbs the rest (the risk list,
 * "a trigger storm").
 */
const nudgeDelayMs = 500;

/**
 * The event that the browser part hears, and the 1 field that it gets: `pocket.on("changed", ({ conversationId }) => …)`.
 *
 * An event cannot be addressed to 1 conversation, so it is a nudge for each tab, and each tab re-reads only when the id is
 * its own (decision 5). `openspec-status/index.js` is the other side of this name and this field.
 */
const changedEvent = "changed";

/**
 * The trigger of the browser part, in the shape of the event's data: `{ conversationId }`.
 *
 * It is a number, the id that `pocket.conversationId()` gives a tab, and the id of `host.on`'s `run.ended`.
 */
export interface ChangedEvent {
    /** The session whose OpenSpec reading can be new. */
    readonly conversationId: number;
}

/** The 2 tools that write 1 file, whose `path` argument names it: a task file is made with `write` and changed with `edit`. */
const fileTools: readonly string[] = ["write", "edit"];

/** The tool that runs a command line, whose `command` argument holds its text. */
const commandTool = "bash";

/**
 * The timers that are on their way, 1 for each conversation that had a trigger.
 *
 * The key is the conversation, so 10 triggers of 1 session give 1 event, and a trigger of another session never restarts
 * this one's timer: the debounce is per conversation. `stopNudges` clears them when this version of the module goes.
 */
const pendingNudges = new Map<number, ReturnType<typeof setTimeout>>();

/** Tells whether 1 `path` of a `write` or an `edit` call is under an `openspec/` folder, relative to the session or not. */
function isUnderOpenSpec(path: string): boolean {
    return path.split(/[\\/]+/).includes("openspec");
}

/**
 * Tells whether 1 tool call can change the OpenSpec project of its session (task 2.6): a write of a file under
 * `openspec/`, or a bash command whose text names `openspec`. Every other call answers `false`, and gives no event.
 */
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

/**
 * The 1 nudge of 1 conversation: 1 `changed` event 500 ms after the last trigger of that conversation (decision 5).
 *
 * A trigger restarts the timer of its own conversation, so 10 triggers within 1 second give 1 event. `web.send` never
 * throws, so a timer cannot stop the server.
 */
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

/** Stops each timer of this module: a module that goes, or is replaced, sends no event after it (cleanups). */
function stopNudges(): void {
    for (const timer of pendingNudges.values()) {
        clearTimeout(timer);
    }
    pendingNudges.clear();
}

/**
 * The 2 triggers of this module (task 2.6): `host.on("run.ended")` and 1 tool hook, and each ends in 1 nudge of its own
 * conversation.
 *
 * The hook watches after the call ran, so it sees the call's writes already on disk, and it blocks nothing: it returns
 * `undefined` for each call. The caller checks the 2 members that the triggers need, in the style of `hasAddition`, so an
 * older Pi Pocket gives 1 warning and no throw.
 */
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

    // `web.onDispose` came in 0.14.0, the oldest API level that Pi Pocket loads, so this check is for a server that is
    // older than this module: it keeps the triggers and loses the cleanup.
    if (typeof web.onDispose === "function") {
        web.onDispose(stopRunEnded);
        web.onDispose(stopNudges);
    }

    return [toolHook];
}

export default function createExtension(host: Host, web: Web): ReturnType<typeof defineExtension> {
    // The feature checks. On an older Pi Pocket the owner gets 1 warning, and the module installs nothing else: it does
    // not fall back to a route that the server does not have, and it does not read folders in a way that nobody asked
    // for.
    const missing = missingServerAdditions({ host, web });
    if (missing.length > 0) {
        host.notice(
            "warning",
            `${extensionName} needs ${neededPocket}, and this app does not have ${missing.join(" and ")}. The module did nothing.`,
        );
        return defineExtension({ name: extensionName });
    }

    // The browser part: the folder `openspec-status/` beside this file, whose `index.js` draws the status item and the
    // panel (task 3.1). `web.client` came in 0.14.0, the oldest API level that Pi Pocket loads, so this check is for an app
    // that is older than this module: it loses the drawing, and the route still answers.
    if (typeof web.client === "function") {
        web.client(browserEntry);
    } else {
        host.notice(
            "warning",
            `${extensionName} has no browser part on this app: it has no web.client. The reading still answers ${routePath}.`,
        );
    }

    // The 1 route: `GET status/:source` with `{ conversation: "source" }`, so the app resolves the session and checks
    // that the person may see it before `answerStatus` runs, and no request can name a folder (decision 3).
    web.conversationRoute("GET", routePath, answerStatus, { conversation: routeSource });

    // The 2 triggers of task 2.6, guarded in the style of `hasAddition`: `host.on` came in 0.22.0 and `web.send` in
    // 0.14.0. An app without one of them gets 1 warning and no trigger, and the route above still answers.
    const canTrigger = typeof host.on === "function" && typeof web.send === "function";
    if (!canTrigger) {
        host.notice(
            "warning",
            `${extensionName} has no triggers on this app: it has no host.on or no web.send. The reading still answers ${routePath}.`,
        );
    }
    const hooks = canTrigger ? installTriggers(host, web) : [];

    return defineExtension({ name: extensionName, hooks });
}
