/**
 * The browser part of pty-terminal: the shell of the module, in a panel.
 *
 * What it draws: the vendored xterm renderer fills the panel, and the shell writes its prompt and its output on it. The
 * screen takes the whole width of the panel, at a phone's width too.
 *
 * What it sends: the keys of the person, as a POST to the `input` route, and the new column and row count after the
 * panel changes size. No text of the screen goes to the message box, and none of it reaches the model.
 *
 * What it listens for: the 4 events of the module. The snapshot replaces the screen, a frame adds output, a refusal says
 * why this person may not type, and the end state says "session ended" with the exit status and stops the input.
 *
 * Where it loads the renderer: `lib/` in this folder, never a CDN. The app's Content Security Policy is `script-src
 * 'self'`, so a remote file could not load. The install skill copies this folder to `<drop-in>/pty-terminal/`, which
 * keeps the 2 files at `lib/xterm.mjs` and `lib/addon-fit.mjs` relative to this file.
 */
import { FitAddon } from "./lib/addon-fit.mjs";
import { Terminal } from "./lib/xterm.mjs";

// 1, not 2: this module returns no tool `output`, so it loads on Pi Pocket 0.18 too. A panel came in 0.19.0, and
// an older app has none, so `setup` does nothing there instead of throwing at its first use.
export const pocketApi = 1;

// The panel of the module. `id` is the module's own, and `icon` is 1 of the app's names.
const panelId = "shell";
const panelTitle = "Terminal";
const panelIcon = "terminal";

// The 4 events of `pty-terminal.ts`, and the 2 routes that `pocket.api` reaches. A route is under
// `/api/x/pty-terminal/`, and `pocket.api` takes the path after that, with the session's id in it.
const snapshotEvent = "pty-terminal.snapshot";
const frameEvent = "pty-terminal.frame";
const refusalEvent = "pty-terminal.refusal";
const endEvent = "pty-terminal.end";

// The wait after the last change of the panel's size. A phone that turns sends 1 request for the new count, not 10.
const resizeWaitMs = 200;

// The smallest size that the panel posts, in columns or rows.
const minSide = 2;

// The frames that may wait for the snapshot: the snapshot carries the last 64 KB, so a longer wait is not needed.
const maxWaiting = 200;

// The font of the screen. It is a font list, not the app's `--mono` token, because the renderer measures it as it draws.
const fontFamily = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

/** Whether `value` is a JSON object. */
function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** 1 side of a size: a whole number of at least 2, or `null` when the value is not 1. */
function sideOf(value) {
    return Number.isInteger(value) && value >= minSide ? value : null;
}

/** The words of the end of the shell: "session ended" and the status, and the signal when a signal ended it. */
function endTextOf(end) {
    const status = isObject(end) && Number.isInteger(end.status) ? end.status : null;
    const signal = isObject(end) && typeof end.signal === "string" && end.signal !== "" ? end.signal : null;
    const words = status === null ? "session ended" : `session ended · exit ${status}`;

    return signal === null ? words : `${words} (${signal})`;
}

/** The words of a failure: the server's own words when it sent them, else 1 that says what went wrong. */
function messageOf(failure) {
    if (typeof failure === "string" && failure !== "") {
        return failure;
    }

    if (typeof failure?.message === "string" && failure.message !== "") {
        return failure.message;
    }

    return "the terminal could not reach the module";
}

/** The 2 colours of the app that the screen follows, or `undefined` when the theme names neither of them. */
function themeOf() {
    if (typeof document === "undefined" || typeof getComputedStyle !== "function") {
        return undefined;
    }

    const style = getComputedStyle(document.documentElement);
    const background = style.getPropertyValue("--bg").trim();
    const foreground = style.getPropertyValue("--text").trim();

    return background === "" || foreground === ""
        ? undefined
        : { background, foreground, cursor: foreground };
}

export default function setup(pocket) {
    // A panel came in 0.19.0 and is experimental: an older app has none, so this module does nothing there.
    if (typeof pocket.panel !== "function") {
        return;
    }

    const { html, useEffect, useRef, useState } = pocket;

    // The words of the panel beside the screen: the refusal of the module, or the end of the shell. A panel that opens
    // after it shows it at once, because the app keeps no event for a page that was closed.
    let note = null;

    // The setter of the open panel, so 1 event draws the panel again.
    const watchers = new Set();

    // The screen of the open panel: the renderer, the fit add-on, the number of the output that it holds, the frames
    // that wait for its snapshot, and whether the shell of it ended.
    let screen = null;

    // The stop functions of the 4 listeners of the module.
    let stops = [];

    /** Gives the panel the words of `next`, and draws it. `null` means no words. */
    function publish(next) {
        note = next;

        for (const watcher of watchers) {
            watcher(next);
        }
    }

    // The input of the person goes 1 request at a time, in the order that the keys came: 2 requests that overlap can
    // reach the shell in the other order, and "abc" then arrives as "acb".
    let queue = Promise.resolve();

    /** Posts 1 request to the module's `input` route for the session that the tab shows now. */
    async function postInput(body) {
        const conversationId = pocket.conversationId();

        if (conversationId === null) {
            return;
        }

        try {
            // The answer of a refusal is `accepted: false`, and the module sends the reason as the refusal event, which
            // the panel shows. A failure says why in the panel.
            await pocket.api(`${conversationId}/input`, body);
        } catch (failure) {
            publish({ kind: "refused", text: messageOf(failure) });
        }
    }

    /** Sends the bytes of 1 keystroke or 1 paste, after the bytes that came before it. */
    function sendInput(data) {
        queue = queue.then(() => postInput({ data }));
    }

    /**
     * Applies 1 frame to the screen. The rule of the protocol: a frame whose number is not greater than the number that
     * the screen holds is 1 that the screen already has, so it is dropped.
     */
    function applyFrame(frame) {
        if (screen === null || !isObject(frame) || !Number.isInteger(frame.seq)) {
            return;
        }

        if (frame.seq <= screen.seq) {
            return;
        }

        screen.seq = frame.seq;

        if (typeof frame.data === "string" && frame.data !== "") {
            screen.terminal.write(frame.data);
        }
    }

    /** The end of the shell: "session ended" and the status, and no more typing. The last screen stays as it is. */
    function showEnd(end) {
        if (screen !== null) {
            screen.ended = true;
            screen.ready = true;
            // The numbers of a shell end with it, and a new shell of this conversation starts at 0 again.
            screen.seq = 0;
            screen.terminal.options.disableStdin = true;
        }

        publish({ kind: "ended", text: endTextOf(end) });
    }

    /** Takes the frames that waited for the snapshot, and sets the words of a shell that is there, or gone. */
    function settle(running) {
        if (screen === null) {
            return;
        }

        screen.ready = true;

        const waiting = screen.waiting;
        screen.waiting = [];

        for (const frame of waiting) {
            applyFrame(frame);
        }

        if (running) {
            publish(null);
            return;
        }

        showEnd(null);
    }

    // The snapshot of the module: the last 64 KB of the shell, and the number that the frames after it must pass. The
    // panel asks for 1 when it mounts, because the app keeps no event for a page that was closed.
    function onSnapshot(snapshot) {
        if (screen === null || !isObject(snapshot)) {
            return;
        }

        const seq = Number.isInteger(snapshot.seq) ? snapshot.seq : null;

        // A snapshot older than the number of the screen is 1 that the screen already holds.
        if (seq !== null && seq < screen.seq) {
            return;
        }

        if (seq !== null) {
            screen.seq = seq;
        }

        if (typeof snapshot.data === "string" && snapshot.data !== "") {
            screen.terminal.write(snapshot.data);
        }

        settle(snapshot.running !== false);
    }

    // 1 frame of output. A frame that comes before the snapshot waits for it, so no text is written 2 times or in the
    // other order.
    function onFrame(frame) {
        if (screen === null || !isObject(frame)) {
            return;
        }

        if (!screen.ready) {
            if (screen.waiting.length < maxWaiting) {
                screen.waiting.push(frame);
            }

            return;
        }

        applyFrame(frame);
    }

    // 1 refusal: why this person may not type. The screen keeps its text, and only the words of the panel change.
    function onRefusal(refusal) {
        const reason = isObject(refusal) && typeof refusal.reason === "string" ? refusal.reason : null;

        publish({ kind: "refused", text: reason ?? "the module refused the input" });
    }

    /** Starts the 4 listeners of the module. 1 call is enough: a second 1 adds nothing. */
    function listen() {
        if (stops.length > 0) {
            return;
        }

        stops = [
            pocket.on(snapshotEvent, onSnapshot),
            pocket.on(frameEvent, onFrame),
            pocket.on(refusalEvent, onRefusal),
            pocket.on(endEvent, showEnd),
        ];
    }

    /** Stops the 4 listeners. The panel calls this when it closes, so no event of a closed panel reaches it. */
    function stopListening() {
        for (const stop of stops) {
            stop();
        }

        stops = [];
    }

    /**
     * The panel: the words of a refusal or of the end, the screen of the shell, and 1 line that names what the screen is.
     * The screen takes the width of the panel and the rest of its height, at a phone's width too.
     */
    function ShellPanel() {
        const holder = useRef(null);
        const [words, setWords] = useState(note);
        const [failure, setFailure] = useState(null);

        useEffect(() => {
            const element = holder.current;

            if (element === null) {
                return;
            }

            let gone = false;
            let timer = null;
            let size = { cols: null, rows: null };

            const terminal = new Terminal({
                cursorBlink: true,
                fontFamily,
                fontSize: 13,
                scrollback: 5_000,
                theme: themeOf(),
            });
            const fit = new FitAddon();

            terminal.loadAddon(fit);
            terminal.open(element);

            // The screen of this panel. The snapshot is not in yet, so the frames wait.
            screen = { terminal, ready: false, waiting: [], seq: 0, ended: false };

            const conversationId = pocket.conversationId();

            /** Fits the screen to the panel, and posts the count only when the count really changed. */
            function fitNow() {
                timer = null;

                if (gone || element.clientWidth === 0) {
                    return;
                }

                try {
                    fit.fit();
                } catch {
                    // A panel that is not on screen has no size to fit. The next change of size tries again.
                }

                const cols = sideOf(terminal.cols);
                const rows = sideOf(terminal.rows);

                if (cols === null || rows === null || (cols === size.cols && rows === size.rows)) {
                    return;
                }

                size = { cols, rows };
                void postInput({ cols, rows });
            }

            /** Waits for the size to stop changing, then fits: 1 turn of a phone gives 1 request, not 10. */
            function scheduleFit() {
                if (timer !== null) {
                    clearTimeout(timer);
                }

                timer = setTimeout(fitNow, resizeWaitMs);
            }

            const observer = new ResizeObserver(scheduleFit);
            observer.observe(element);

            const typed = terminal.onData((data) => {
                if (screen === null || screen.ended || data === "") {
                    return;
                }

                sendInput(data);
            });

            // The state that is current comes first, and the listeners take the output from there. A panel of a viewer
            // gets the status 403 here, with the server's own words.
            async function readState() {
                if (conversationId === null) {
                    setFailure("no session is open, so the terminal has no shell");
                    return;
                }

                try {
                    const snapshot = await pocket.api(`${conversationId}/state`);

                    if (!gone) {
                        onSnapshot(snapshot);
                    }
                } catch (error) {
                    if (!gone) {
                        setFailure(messageOf(error));
                    }
                }
            }

            void readState();
            listen();
            watchers.add(setWords);
            setWords(note);

            return () => {
                gone = true;
                watchers.delete(setWords);
                stopListening();
                observer.disconnect();

                if (timer !== null) {
                    clearTimeout(timer);
                    timer = null;
                }

                typed.dispose();
                terminal.dispose();
                screen = null;
            };
        }, []);

        const noteStyle =
            words === null
                ? null
                : `margin:0;min-width:0;overflow-wrap:anywhere;font-weight:600;color:var(--${
                      words.kind === "ended" ? "muted" : "warn"
                  });`;

        return html`<div
            class="pty-terminal"
            style="display:flex;flex-direction:column;gap:8px;width:100%;min-width:0;height:100%;min-height:0;"
        >
            ${words !== null && html`<p class="small" style=${noteStyle}>${words.text}</p>`}
            <div
                ref=${holder}
                class="pty-screen"
                style="flex:1;width:100%;min-width:0;min-height:0;overflow:hidden;border:1px solid var(--line);border-radius:8px;background:var(--card);"
            ></div>
            ${failure !== null && html`<p class="error-box small" style="margin:0;">${failure}</p>`}
            <p class="small muted" style="margin:0;min-width:0;overflow-wrap:anywhere;">
                ${words !== null && words.kind === "ended"
                    ? "The screen keeps its last text. Open the panel again for a new shell."
                    : "The shell runs on the server, as its user. Its output never reaches the model."}
            </p>
        </div>`;
    }

    // The stylesheet of the renderer, from this folder: `pocket.style` takes the path inside the browser module's
    // folder, and it puts the file in the app's own cascade layer.
    pocket.style("css/xterm.css");

    pocket.panel({
        id: panelId,
        title: panelTitle,
        component: ShellPanel,
        icon: panelIcon,
        wide: true,
    });

    // The listeners start here, so that no frame of a shell that is already there is missed before the panel mounts.
    // The panel stops them when it closes, and starts them again when it opens.
    listen();

    // The app runs what this returns when this version of the module goes.
    return stopListening;
}
