/**
 * Gives a person a real terminal in a panel, with a shell in a pseudo-terminal on the server.
 *
 * What it does: the panel of the module shows an xterm renderer, and this module runs the shell behind it. The shell is
 * a child of the Perl helper `pty-terminal/pty-helper.pl`, which opens `/dev/ptmx` itself and gives the natural size
 * `100x30` to the slave before it starts the shell. The helper's stdout and stderr carry the pty bytes unchanged, and
 * the module writes the input bytes of the person to the helper's stdin. A resize is 4 bytes on the helper's control
 * file descriptor 3, so no `stty` line ever appears on the screen.
 *
 * What it sends: the output of the shell as frames of at most 1 each 33 ms, each frame below the 256 KB limit of 1
 * event, plus a snapshot of the last 64 KB when a panel mounts. Each frame and snapshot carries a sequence number, so a
 * panel discards a frame that it already has, and a browser reload shows the last screen and adds no duplicate text.
 *
 * What it writes: the pty output as text, appended as each chunk arrives, to `/data/pty/<conversationId>.log`. The
 * folder is the only place outside Pi Pocket's own files that this module writes.
 *
 * What it does not do: it adds no tool and no command, so no terminal output can reach Pi's prompt or a tool result. The
 * shell is a child of this module, so a module reload or a server restart kills it: durability is Level 0, and a panel
 * never attaches to an older shell. Only a person may type, and a viewer gets the status 403 from each route.
 */
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { appendFile, mkdir, stat } from "node:fs/promises";
import { constants as osConstants } from "node:os";
import { join } from "node:path";
import { Readable, Writable } from "node:stream";
import { defineExtension } from "@earendil-works/pi-durable";
import type { ConversationId } from "@earendil-works/pi-durable";
import type { ConversationWebRequest, Host, Web } from "./_pocket.d.ts";

// The name of this module. It is here, in 1 place, so that a copy is easy to rename.
const extensionName = "pty-terminal";

// The oldest Pi Pocket that this module works with: it needs `web.conversationRoute` (0.16.0).
const neededPocket = "Pi Pocket 0.16.0";

// The browser part is the folder beside the module.
const browserEntry = extensionName;

// The Perl helper, beside the module in the drop-in folder, and the interpreter that runs it.
const helperFile = "pty-helper.pl";
const helperRunner = "/usr/bin/perl";

// The scrollback file of each session: text only, 1 file each conversation.
const logFolder = "/data/pty";

// The 2 routes. Pi Pocket puts a module's routes under `/api/x/<module>/`, so the addresses are
// `GET /pty-terminal/:conversation/state` and `POST /pty-terminal/:conversation/input` in the module's own space, and
// `/api/x/pty-terminal/:conversation/state` and `/api/x/pty-terminal/:conversation/input` on the server.
const snapshotPath = ":conversation/state";
const inputPath = ":conversation/input";

// The 4 events that the browser part listens for.
const snapshotEvent = "pty-terminal.snapshot";
const frameEvent = "pty-terminal.frame";
const refusalEvent = "pty-terminal.refusal";
const endEvent = "pty-terminal.end";

// The start size of the helper. The panel fits its own size and posts it after the first frame.
const startCols = 100;
const startRows = 30;

// The largest size that a panel may post, in columns or rows.
const maxSide = 1_000;

// The largest paste that 1 input request may carry, in characters.
const maxInputLength = 64 * 1024;

// 1 frame each 33 ms: at most 30 frames each second, below the 100 events that `web.send` keeps each second.
const frameIntervalMs = 33;

// The documented limits of 1 event, and the room that a frame leaves for its envelope and its keys.
const eventLimitBytes = 256 * 1024;
const frameRoomBytes = eventLimitBytes - 4 * 1024;

// The smallest frame that is worth the wait; below it the module waits for the next window.
const minFrameBytes = 64;

// The ring buffer that a snapshot replays: the last 64 KB of output that was sent as frames.
const ringLimitBytes = 64 * 1024;

// The budget of this module: at most 100 events each second and at most 900 KB each second, under the documented
// 100 events and 1 MB. Output above the budget waits in the buffer and drains later: nothing is dropped.
const windowMs = 1_000;
const maxEventsPerWindow = 100;
const maxWindowBytes = 900 * 1024;

// The room that the frame writer keeps in the window for the other events, such as an end state.
const budgetHeadroomBytes = 4 * 1024;

// How long the module waits before it tries a full window again.
const windowRetryMs = 100;

// How long a child gets between SIGTERM and SIGKILL, when the module is disposed.
const killGraceMs = 250;

/** 1 frame of output: the bytes of the shell and the number that a panel compares with its snapshot. */
interface FramePayload {
    readonly seq: number;
    readonly cols: number;
    readonly rows: number;
    readonly data: string;
}

/** The answer of the `state` route: the last 64 KB of output and the last number that was sent. */
interface SnapshotPayload {
    readonly seq: number;
    readonly data: string;
    readonly cols: number;
    readonly rows: number;
    readonly running: boolean;
}

/** Why the module refused 1 input: the panel shows the reason to the person who typed. */
interface RefusalPayload {
    readonly reason: string;
}

/** How the shell ended. A signal-killed child has the status 128 plus the signal number, as a shell reports it. */
interface EndPayload {
    readonly status: number;
    readonly signal: string | null;
}

/** 1 event that `web.send` took, with the size of its JSON, for the budget of 1 second. */
interface SentEvent {
    readonly timeMs: number;
    readonly bytes: number;
}

/** 1 shell, and the buffered output that has not reached the panel yet. */
interface Session {
    readonly conversationId: ConversationId;
    readonly logPath: string;
    readonly child: ChildProcess;
    readonly input: Writable;
    readonly control: Writable | null;
    cols: number;
    rows: number;
    /** The person who typed first. The extension API gives no driver, so the module keeps this rule itself. */
    driverId: string | null;
    /** The number of the last frame that was sent; it grows by 1 each frame and never goes back. */
    seq: number;
    /** The last 64 KB of output that was sent, by escaped JSON size, and the size of that text. */
    ring: string;
    ringBytes: number;
    /** Output that waits for the next frame, as the chunks that the helper wrote. */
    pending: string[];
    timer: ReturnType<typeof setTimeout> | null;
    lastFrameMs: number;
    ended: boolean;
    end: EndPayload | null;
    endSent: boolean;
    /** The chain of log writes, so that the text of the file keeps the order of the output. */
    writing: Promise<void>;
    warnedLog: boolean;
    warnedError: boolean;
}

/** Everything that 1 loaded version of this module owns. Nothing lives at module level, so a reload starts clean. */
interface Terminal {
    readonly host: Host;
    readonly web: Web;
    readonly sessions: Map<ConversationId, Session>;
    /** The shells that are starting now, so 2 panels that open together share 1 child. */
    readonly starting: Map<ConversationId, Promise<Session>>;
    readonly sent: SentEvent[];
    /** True once this version of the module goes: no shell starts after it. */
    closed: boolean;
}

// The number of each signal, for the status of a shell that a signal killed. It is built 1 time.
const signalNumbers: ReadonlyMap<string, number> = new Map(Object.entries(osConstants.signals));

/** The additions to `host` and `web` that this module cannot work without. */
function missingServerAdditions(host: Host, web: Web): string[] {
    const missing: string[] = [];
    if (typeof web.conversationRoute !== "function") {
        missing.push("web.conversationRoute");
    }
    if (typeof web.client !== "function") {
        missing.push("web.client");
    }
    if (typeof web.send !== "function") {
        missing.push("web.send");
    }
    if (typeof web.error !== "function") {
        missing.push("web.error");
    }
    if (typeof web.onDispose !== "function") {
        missing.push("web.onDispose");
    }
    if (typeof host.notice !== "function") {
        missing.push("host.notice");
    }
    if (typeof host.dataDir !== "string") {
        missing.push("host.dataDir");
    }
    return missing;
}

/** The words of an error, for a notice and for the person who asked. */
function describe(error: unknown): string {
    if (error instanceof Error && error.message !== "") {
        return error.message;
    }
    return String(error);
}

/**
 * The size of 1 code point as JSON writes it. A control character becomes `\u001b` and a quote or a backslash becomes
 * `\"` or `\\`, and the other characters keep 1 to 4 bytes of UTF-8. The answer is an upper bound, so a frame that it
 * measures is always below the limit of 1 event.
 */
function escapedBytes(character: string): number {
    const code = character.codePointAt(0) ?? 0;
    if (code < 0x20 || code === 0x7f) {
        return 6;
    }
    if (character === "\"" || character === "\\") {
        return 2;
    }
    if (code < 0x80) {
        return 1;
    }
    if (code < 0x800) {
        return 2;
    }
    if (code < 0x10000) {
        return 3;
    }
    return 4;
}

/** The escaped JSON size of a text, as an upper bound. */
function jsonBytesOf(text: string): number {
    let bytes = 0;
    for (const character of text) {
        bytes += escapedBytes(character);
    }
    return bytes;
}

/**
 * Cuts the largest head of `text` that fits in `limitBytes`, and gives back the rest. A head is never empty while the
 * text is not, so the flush loop always makes progress.
 */
function cutForFrame(text: string, limitBytes: number): { readonly head: string; readonly rest: string } {
    if (text === "") {
        return { head: "", rest: "" };
    }
    let bytes = 0;
    let index = 0;
    for (const character of text) {
        const size = escapedBytes(character);
        if (bytes + size > limitBytes) {
            break;
        }
        bytes += size;
        index += character.length;
    }
    if (index === 0) {
        // 1 code point alone is larger than the room: send it, rather than wait for ever.
        const first = text.codePointAt(0) ?? 0;
        index = first > 0xffff ? 2 : 1;
    }
    return { head: text.slice(0, index), rest: text.slice(index) };
}

// The log folder is made 1 time for the whole version of the module, and its trouble is kept.
let logFolderTrouble: Promise<string | null> | null = null;

/** Makes `/data/pty/` when it is not there. The answer is the words of a failure, or `null` when it is ready. */
function prepareLogFolder(): Promise<string | null> {
    if (logFolderTrouble === null) {
        logFolderTrouble = mkdir(logFolder, { recursive: true }).then(
            () => null,
            (error: unknown) => describe(error),
        );
    }
    return logFolderTrouble;
}

/** Appends 1 chunk of pty output to the scrollback file, in the order that the shell wrote it. */
function appendToLog(terminal: Terminal, session: Session, text: string): void {
    session.writing = session.writing.then(async () => {
        const trouble = await prepareLogFolder();
        if (trouble !== null) {
            if (!session.warnedLog) {
                session.warnedLog = true;
                terminal.host.notice(
                    "warning",
                    `${extensionName} cannot make the folder ${logFolder}, so the scrollback is not kept: ${trouble}`,
                    session.conversationId,
                );
            }
            return;
        }
        try {
            await appendFile(session.logPath, text, { encoding: "utf8" });
        } catch (error) {
            if (!session.warnedLog) {
                session.warnedLog = true;
                terminal.host.notice(
                    "warning",
                    `${extensionName} cannot write ${session.logPath}, so the scrollback is not kept: ${describe(error)}`,
                    session.conversationId,
                );
            }
        }
    });
}

/** Keeps the last 64 KB of output that was sent, by escaped JSON size, so the snapshot is 1 event too. */
function appendToRing(session: Session, text: string): void {
    const added = jsonBytesOf(text);
    session.ring += text;
    session.ringBytes += added;
    if (session.ringBytes <= ringLimitBytes) {
        return;
    }
    const overflow = session.ringBytes - ringLimitBytes;
    let dropped = 0;
    let index = 0;
    for (const character of session.ring) {
        if (dropped >= overflow) {
            break;
        }
        dropped += escapedBytes(character);
        index += character.length;
    }
    session.ring = session.ring.slice(index);
    session.ringBytes -= dropped;
}

/** Forgets the events of the window that ended, so the budget counts the last second only. */
function windowUsed(terminal: Terminal, nowMs: number): { readonly events: number; readonly bytes: number } {
    while (terminal.sent.length > 0 && nowMs - terminal.sent[0].timeMs >= windowMs) {
        terminal.sent.shift();
    }
    let bytes = 0;
    for (const sent of terminal.sent) {
        bytes += sent.bytes;
    }
    return { events: terminal.sent.length, bytes };
}

/** Counts 1 event that `web.send` took. */
function noteSend(terminal: Terminal, bytes: number, nowMs: number): void {
    terminal.sent.push({ timeMs: nowMs, bytes });
}

/** Runs 1 step of the flush loop after `waitMs`. Only 1 step of 1 session waits at a time. */
function schedule(terminal: Terminal, session: Session, waitMs: number): void {
    if (session.timer !== null) {
        return;
    }
    session.timer = setTimeout(() => {
        session.timer = null;
        step(terminal, session);
    }, Math.max(0, waitMs));
}

/**
 * Sends 1 frame when the 33 ms window and the budget of the module allow it, and drains the rest later. When no output
 * waits, it sends the end state of a shell that has gone.
 */
function step(terminal: Terminal, session: Session): void {
    const nowMs = Date.now();
    const used = windowUsed(terminal, nowMs);

    if (session.pending.length > 0) {
        const waitMs = session.lastFrameMs + frameIntervalMs - nowMs;
        if (waitMs > 0) {
            schedule(terminal, session, waitMs);
            return;
        }
        const room = Math.min(frameRoomBytes, maxWindowBytes - used.bytes - budgetHeadroomBytes);
        if (used.events >= maxEventsPerWindow || room < minFrameBytes) {
            schedule(terminal, session, windowRetryMs);
            return;
        }
        const text = session.pending.length === 1 ? session.pending[0] : session.pending.join("");
        const cut = cutForFrame(text, room);
        session.pending = cut.rest === "" ? [] : [cut.rest];
        session.seq += 1;
        appendToRing(session, cut.head);
        const frame: FramePayload = { seq: session.seq, cols: session.cols, rows: session.rows, data: cut.head };
        const bytes = JSON.stringify(frame).length;
        terminal.web.send(frameEvent, frame);
        // The event counts from the moment that `web.send` took it, so the budget window is never short.
        session.lastFrameMs = Date.now();
        noteSend(terminal, bytes, session.lastFrameMs);
        if (session.pending.length > 0) {
            schedule(terminal, session, frameIntervalMs);
        } else if (session.end !== null && !session.endSent) {
            schedule(terminal, session, 0);
        }
        return;
    }

    if (session.end !== null && !session.endSent) {
        if (used.events >= maxEventsPerWindow) {
            schedule(terminal, session, windowRetryMs);
            return;
        }
        session.endSent = true;
        terminal.web.send(endEvent, session.end);
        noteSend(terminal, JSON.stringify(session.end).length, Date.now());
        // The session is done: a new panel gets a new shell, and this record is no longer needed.
        if (terminal.sessions.get(session.conversationId) === session) {
            terminal.sessions.delete(session.conversationId);
        }
    }
}

/** The answer of the `state` route, and the payload of the `snapshot` event. */
function snapshotOf(session: Session): SnapshotPayload {
    return {
        seq: session.seq,
        data: session.ring,
        cols: session.cols,
        rows: session.rows,
        running: !session.ended,
    };
}

/** How the shell ended, as a shell reports it: a signal gives 128 plus the signal number. */
function endPayloadOf(code: number | null, signal: string | null): EndPayload {
    if (code !== null) {
        return { status: code, signal: null };
    }
    const number = signal === null ? undefined : signalNumbers.get(signal);
    return { status: 128 + (number ?? 0), signal };
}

/** 1 pipe of a child, by the position of the `stdio` option, or `null` when that position is not a pipe. */
function readablePipe(child: ChildProcess, position: number): Readable | null {
    const entry = child.stdio[position];
    return entry instanceof Readable ? entry : null;
}

function writablePipe(child: ChildProcess, position: number): Writable | null {
    const entry = child.stdio[position];
    return entry instanceof Writable ? entry : null;
}

/** True when the helper file is there. */
async function isThere(path: string): Promise<boolean> {
    try {
        await stat(path);
        return true;
    } catch {
        return false;
    }
}

/** The helper of the drop-in folder, which travels with the module file. */
function helperPath(terminal: Terminal): string {
    return join(terminal.host.dataDir, "extensions", extensionName, helperFile);
}

/** Hands 1 chunk of pty output to the log file, the frame buffer, and the flush loop. */
function takeOutput(terminal: Terminal, session: Session, text: string): void {
    if (text === "") {
        return;
    }
    appendToLog(terminal, session, text);
    session.pending.push(text);
    schedule(terminal, session, 0);
}

/** Writes 1 resize frame of 4 bytes to the helper's control file descriptor 3, and keeps the new size. */
function applySize(terminal: Terminal, session: Session, cols: number, rows: number): void {
    session.cols = cols;
    session.rows = rows;
    if (session.control === null) {
        return;
    }
    const frame = Buffer.alloc(4);
    frame.writeUInt16LE(cols, 0);
    frame.writeUInt16LE(rows, 2);
    try {
        session.control.write(frame);
    } catch (error) {
        terminal.host.notice(
            "warning",
            `${extensionName} could not resize the shell to ${String(cols)}x${String(rows)}: ${describe(error)}`,
            session.conversationId,
        );
    }
}

/**
 * Starts 1 shell for 1 conversation. The child is the Perl helper, which opens the pty and runs `bash -i`. The 4th
 * `stdio` entry is the control pipe of the resize frames.
 */
async function startSession(terminal: Terminal, conversationId: ConversationId): Promise<Session> {
    const helper = helperPath(terminal);
    if (!(await isThere(helper))) {
        throw new Error(`the helper ${helper} is not there; copy the module folder into the drop-in folder again`);
    }
    const child = spawn(helperRunner, [helper], { stdio: ["pipe", "pipe", "pipe", "pipe"] });
    const input = writablePipe(child, 0);
    const output = readablePipe(child, 1);
    const errors = readablePipe(child, 2);
    const control = writablePipe(child, 3);
    if (input === null || output === null) {
        child.kill("SIGKILL");
        throw new Error("the helper started without its pipes");
    }
    if (terminal.closed) {
        child.kill("SIGKILL");
        throw new Error("the module is going, so no shell starts now");
    }

    const session: Session = {
        conversationId,
        logPath: join(logFolder, `${String(conversationId)}.log`),
        child,
        input,
        control,
        cols: startCols,
        rows: startRows,
        driverId: null,
        seq: 0,
        ring: "",
        ringBytes: 0,
        pending: [],
        timer: null,
        lastFrameMs: 0,
        ended: false,
        end: null,
        endSent: false,
        writing: Promise.resolve(),
        warnedLog: false,
        warnedError: false,
    };
    terminal.sessions.set(conversationId, session);

    output.setEncoding("utf8");
    output.on("data", (chunk: string) => {
        takeOutput(terminal, session, chunk);
    });
    output.on("error", () => {
        // A closed pty reports its end through `close`, which sends the end state.
    });
    input.on("error", () => {
        // A write after the shell is gone is reported by `close`, which sends the end state.
    });
    if (control !== null) {
        control.on("error", () => {
            // A closed control pipe only means that a resize has no shell to reach.
        });
    }
    if (errors !== null) {
        errors.setEncoding("utf8");
        errors.on("data", (chunk: string) => {
            // The helper writes its own errors here, never shell output. The person sees them on the screen.
            if (!session.warnedError) {
                session.warnedError = true;
                terminal.host.notice(
                    "warning",
                    `${extensionName}: the terminal helper reported: ${chunk.trim()}`,
                    conversationId,
                );
            }
            takeOutput(terminal, session, chunk);
        });
    }

    child.on("error", (error: Error) => {
        terminal.host.notice(
            "error",
            `${extensionName} could not start the shell: ${describe(error)}`,
            conversationId,
        );
        session.ended = true;
        session.end = { status: 1, signal: null };
        schedule(terminal, session, 0);
    });

    // `close` comes after the last chunk of output, so every frame goes before the end state.
    child.on("close", (code: number | null, signal: string | null) => {
        session.ended = true;
        session.end = endPayloadOf(code, signal);
        schedule(terminal, session, 0);
    });

    terminal.web.send(snapshotEvent, snapshotOf(session));
    return session;
}

/** The live shell of 1 conversation, or `null` when there is none. A shell that ended is not live: its panel is done. */
function liveSession(terminal: Terminal, conversationId: ConversationId): Session | null {
    const kept = terminal.sessions.get(conversationId);
    if (kept === undefined || kept.ended) {
        return null;
    }
    return kept;
}

/** The live shell of 1 conversation, or a new 1. A new panel after an exit gets a new shell, never an older one. */
async function sessionFor(terminal: Terminal, conversationId: ConversationId): Promise<Session> {
    const live = liveSession(terminal, conversationId);
    if (live !== null) {
        return live;
    }
    const already = terminal.starting.get(conversationId);
    if (already !== undefined) {
        return await already;
    }
    const started = startSession(terminal, conversationId).finally(() => {
        terminal.starting.delete(conversationId);
    });
    terminal.starting.set(conversationId, started);
    try {
        return await started;
    } catch (error) {
        const words = describe(error);
        terminal.host.notice(
            "error",
            `${extensionName} could not start a shell: ${words}`,
            conversationId,
        );
        throw terminal.web.error(503, `the terminal could not start: ${words}`);
    }
}

/** Kills every child and forgets every session, when this version of the module goes. */
function disposeAll(terminal: Terminal): void {
    terminal.closed = true;
    for (const session of terminal.sessions.values()) {
        if (session.timer !== null) {
            clearTimeout(session.timer);
            session.timer = null;
        }
        if (session.ended) {
            continue;
        }
        try {
            session.child.kill("SIGTERM");
        } catch {
            // A child that is already gone needs no signal.
        }
        setTimeout(() => {
            try {
                session.child.kill("SIGKILL");
            } catch {
                // The shell ended within the grace period, which is the usual answer to SIGTERM.
            }
        }, killGraceMs);
    }
    terminal.sessions.clear();
    terminal.starting.clear();
}

/** The number of 1 side of the panel, or `null` when the value is not a size. */
function sideOf(value: unknown): number | null {
    if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > maxSide) {
        return null;
    }
    return value;
}

/**
 * The `state` route: the last 64 KB of output and its last sequence number. A person whose role is `viewer` gets the
 * status 403, and no shell starts for that person.
 */
async function answerState(terminal: Terminal, request: ConversationWebRequest): Promise<SnapshotPayload> {
    if (request.user.role === "viewer") {
        throw terminal.web.error(403, "only a person who may steer can use the terminal");
    }
    const session = await sessionFor(terminal, request.conversation.id);
    return snapshotOf(session);
}

/**
 * The `input` route: the input bytes of the panel and, when the panel posts them, the new column and row count.
 *
 * Take-turns: this API gives a module no driver of a conversation, so the first person who sends input becomes the
 * driver of the shell. A later input from another person sends no byte to the shell, and that person gets a refusal.
 */
async function answerInput(
    terminal: Terminal,
    request: ConversationWebRequest,
): Promise<{ readonly accepted: boolean; readonly driver: string | null; readonly seq: number }> {
    const session = await sessionFor(terminal, request.conversation.id);
    const personId = request.user.id;

    if (session.driverId === null) {
        session.driverId = personId;
    }
    if (session.driverId !== personId) {
        const refusal: RefusalPayload = { reason: "only the driver may type in this terminal" };
        terminal.web.send(refusalEvent, refusal, { to: personId });
        return { accepted: false, driver: session.driverId, seq: session.seq };
    }

    const body = request.body;
    const cols = sideOf(body.cols);
    const rows = sideOf(body.rows);
    if (cols !== null && rows !== null) {
        applySize(terminal, session, cols, rows);
    }

    const data = body.data;
    if (typeof data === "string" && data !== "") {
        if (data.length > maxInputLength) {
            throw terminal.web.error(413, "the paste is too large for the terminal");
        }
        session.input.write(data, "utf8");
    } else if (cols === null || rows === null) {
        throw terminal.web.error(400, "the terminal needs input bytes or a column and row count");
    }

    return { accepted: true, driver: session.driverId, seq: session.seq };
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

    const terminal: Terminal = { host, web, sessions: new Map(), starting: new Map(), sent: [], closed: false };

    web.client(browserEntry);

    web.conversationRoute("GET", snapshotPath, (request) => answerState(terminal, request), {
        conversation: "conversation",
        access: "view",
    });
    web.conversationRoute("POST", inputPath, (request) => answerInput(terminal, request), {
        conversation: "conversation",
        access: "steer",
    });

    web.onDispose(() => {
        disposeAll(terminal);
    });

    return defineExtension({ name: extensionName });
}
