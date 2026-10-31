// OpenSpec status's browser part: it draws what the module's route reads (design.md decision 1).
//
// Task 3.1: `pocketApi`, the 2 feature checks, and 1 status item that reads the route 1 time.
// Task 3.2: the item's glance for the 4 states (1 change, more than 1, no command, no project).
// Task 3.3: the panel, and its styles in `look.css`.
// Task 3.4: the polling, the `changed` event of this conversation, and no reading while the tab is hidden.
// Task 3.5: the failure states: the last reading stays, with its time, marked stale, and the command's words.
// Task 6.1: the 2 buttons of each change, which put its apply or archive command into the message box of the session,
// and never send it. There is no explore, propose, or verify button.
//
// The parts of `pocket` here are in docs/extensions/browser-modules.md of Pi Pocket, and each one in
// docs/extensions/reference/pocket.md.

// The version of the extension API that this module is written for. It uses nothing that version 2 added (a tool's
// `output`), so 1 loads on Pi Pocket 0.18 too (docs/extensions/reference/api-versions.md).
export const pocketApi = 1;

// The item's id in this module. The app shows it as `ext:openspec-status:status`.
const itemId = "status";

// The panel's id in this module. The app shows it as `ext:openspec-status:detail`.
const panelId = "detail";

// The longest text that an item shows. The app cuts `text` and `short` past 40 characters to 39 and "…", so this
// module keeps to the same limit itself (docs/extensions/reference/limits.md, "Browser modules").
const textLimit = 40;

// The fallback reading: 30 s while a reading changes something, and 30 s more each time that it does not, up to
// 120 s (design.md decision 5; spec.md, "Nothing changes").
const pollStartMs = 30_000;
const pollStepMs = 30_000;
const pollMaxMs = 120_000;

// The age past which the panel marks a reading stale, in milliseconds: 1 minute (task 3.5; spec.md, "The reading is not
// new").
const staleMs = 60_000;

// The event that the server sends when Pi may have changed the OpenSpec state, and its 1 field:
// `pocket.on("changed", ({ conversationId }) => …)`. The event name and payload of `openspec-status.ts` are `changedEvent`
// and `{ conversationId }`, a number equal to `pocket.conversationId()` (design.md decision 5).
const changedEvent = "changed";

/** The words of an item, cut at 40 characters as the app cuts them. */
function cut(text) {
    return text.length <= textLimit ? text : `${text.slice(0, textLimit - 1)}…`;
}

/** The task counter of every change added together: `{ done, total }`. */
function countTasks(changes) {
    let done = 0;
    let total = 0;

    for (const change of changes) {
        done += change.tasks?.done ?? 0;
        total += change.tasks?.total ?? 0;
    }

    return { done, total };
}

/**
 * What 1 reading says, without the time at which it was made: 2 readings with the same signature say the same thing, so
 * the poll grows after 1 that changed nothing, and starts over at 30 s after 1 that did (spec.md, "Nothing changes").
 */
function signatureOf(reading) {
    return reading === null ? "" : JSON.stringify([reading.project, reading.changes, reading.error]);
}

/**
 * What the item says for 1 reading of the route: the `text`, `short`, `title`, and `tone` of a `StatusSpec`
 * (docs/extensions/reference/pocket.md, "StatusSpec").
 */
function glanceOf(reading) {
    const error = reading.error ?? null;

    // The `openspec` command is not on the machine: the item says so, in the warning tone (spec.md, "The command is
    // not installed"; design.md decision 7). This comes before the project check: no command means no project to name.
    if (error?.kind === "not-found") {
        return {
            text: "OpenSpec command not found",
            short: "no OpenSpec",
            title: error.message,
            tone: "warn",
        };
    }

    const changes = Array.isArray(reading.changes) ? reading.changes : [];
    const glance = numbersOf(changes);

    if (error === null) {
        return glance;
    }

    // A reading that failed: the item keeps the numbers of the last good reading, and says in the warning tone that they
    // are not from this reading, with the command's own words as its tooltip. With no earlier good reading there are no
    // numbers to keep, so the item says that the reading failed (task 3.5; spec.md, "The command fails once").
    return changes.length === 0
        ? { text: "OpenSpec failed", short: "failed", title: error.message, tone: "warn" }
        : { ...glance, tone: "warn", title: error.message };
}

/**
 * Whether the panel marks 1 reading stale: whether the numbers on screen are not from now. They are not when the reading
 * failed after a good 1 gave them, or when the reading is more than 1 minute old (task 3.5).
 */
function staleOf(reading, now = Date.now()) {
    if (reading === null) {
        return false;
    }

    const kept = Array.isArray(reading.changes) && reading.changes.length > 0;

    if (reading.error != null && kept) {
        return true;
    }

    const time = Date.parse(reading.at ?? "");

    return Number.isFinite(time) && now - time > staleMs;
}

/** The item of a good reading: the change's name and counter, the count and the summed counter, or no active change. */
function numbersOf(changes) {
    const counter = countTasks(changes);
    const n = `${counter.done}/${counter.total}`;

    if (changes.length === 1) {
        const [change] = changes;

        return {
            text: cut(`${change.name} · ${n}`),
            short: n,
            title: `${change.name}: ${n} tasks done`,
        };
    }

    if (changes.length > 1) {
        return {
            text: cut(`${changes.length} changes · ${n}`),
            short: n,
            title: `${changes.length} active changes: ${n} tasks done`,
        };
    }

    return {
        text: cut(`no active change · ${n}`),
        short: n,
        title: "No active change in the OpenSpec project of this session's folder",
    };
}

/** The share of a change's tasks that are done, as a whole number of percent from 0 to 100. */
function percentOf(tasks) {
    const total = tasks?.total ?? 0;

    if (!(total > 0)) {
        return 0;
    }

    const done = tasks?.done ?? 0;

    return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

/**
 * The state of 1 artifact, as 1 of the 3 marks of design.md decision 7: "done" is `var(--ok)`, "ready" is
 * `var(--muted)`, and "blocked" is `var(--warn)`. A state that this module does not know shows the quiet mark.
 */
function markStateOf(artifact) {
    const status = artifact?.status;

    return status === "done" || status === "blocked" ? status : "ready";
}

/** When the reading was made, in words: "read just now", "read 40 s ago", "read 3 min ago", "read 2 h ago". */
function ageText(at, now = Date.now()) {
    const time = Date.parse(at ?? "");

    if (!Number.isFinite(time)) {
        return "read at an unknown time";
    }

    const seconds = Math.max(0, Math.round((now - time) / 1000));

    if (seconds < 5) {
        return "read just now";
    }

    if (seconds < 60) {
        return `read ${seconds} s ago`;
    }

    const minutes = Math.round(seconds / 60);

    if (minutes < 60) {
        return `read ${minutes} min ago`;
    }

    const hours = Math.round(minutes / 60);

    return hours < 48 ? `read ${hours} h ago` : `read ${Math.round(hours / 24)} d ago`;
}

export default function setup(pocket) {
    // The status item and the panel came in 0.19.0 and are experimental: an older app has neither. The documented
    // check is a run-time one, `typeof pocket.status === "function"`, so this module does nothing there instead of
    // throwing at its first use (docs/extensions/browser-modules.md, "Panels and the status line").
    const present = {
        status: typeof pocket.status === "function",
        panel: typeof pocket.panel === "function",
        // `insertText` came in 0.19.0 too, and the same run-time check keeps an older app from drawing buttons that
        // do nothing (docs/extensions/reference/pocket.md, "insertText").
        insertText: typeof pocket.insertText === "function",
    };

    if (!present.status && !present.panel) {
        return;
    }

    // What a component draws with, and its 2 hooks (docs/extensions/reference/pocket.md, "Drawing").
    const { html, useState, useEffect } = pocket;

    // The last answer of the route, `{ project, changes, at, error }`: task 3.2 turns it into the item's glance, and
    // task 3.3 draws the panel from it.
    let reading = null;

    // What `pocket.status` returned for this module, with `remove`. `null` while the module has no item.
    let item = null;

    // The `setShown` of each opened panel. It is empty while no panel is open.
    const listeners = new Set();

    // The poll of this tab: how long it waits before the next reading, what the last reading said, its 1 timer, and
    // whether this version of the module is gone. The module keeps 1 timer at a time, and it is an ordinary
    // `setTimeout` in the tab, not a route or a timer on the server (design.md decision 5).
    let pollMs = pollStartMs;
    let lastSignature = "";
    let pollTimer = null;
    let stopped = false;

    // A hidden tab shows nothing, so it makes no reading; the browser tells a module with `document.visibilityState`
    // and its `visibilitychange` event (docs/extensions/reference/limits.md, "Browser modules": a hidden tab draws by
    // a short timer, and nothing here may run a reading while it is hidden).
    function tabHidden() {
        return typeof document !== "undefined" && document.visibilityState === "hidden";
    }

    function stopPoll() {
        if (pollTimer !== null) {
            clearTimeout(pollTimer);
            pollTimer = null;
        }
    }

    /** Plans the next fallback reading `pollMs` from now, and plans none at all while the tab is hidden. */
    function schedulePoll() {
        stopPoll();

        if (stopped || tabHidden()) {
            return;
        }

        pollTimer = setTimeout(() => {
            pollTimer = null;
            void read();
        }, pollMs);
    }

    // Reads the route of the session that the tab shows, 1 time, and plans the next reading. The browser sends only
    // the conversation id: the server finds the project root and checks that the person may see that session
    // (design.md decision 3).
    async function read() {
        // 1 reading at a time: the timer of the one that came before gives way to this one.
        stopPoll();

        const conversationId = pocket.conversationId();

        if (conversationId === null) {
            return;
        }

        try {
            reading = await pocket.api(`status/${conversationId}`);
        } catch {
            // No session, no route, or no answer at all. The last reading stays on screen, and the panel marks it stale
            // once its time is more than 1 minute old (task 3.5). The poll goes on at the same wait, because this reading
            // said nothing about a change.
            schedulePoll();
            return;
        }

        const signature = signatureOf(reading);

        // 30 s while a reading changes something, 30 s more each time that it does not, and 120 s at most
        // (spec.md, "Nothing changes").
        pollMs = signature === lastSignature ? Math.min(pollMaxMs, pollMs + pollStepMs) : pollStartMs;
        lastSignature = signature;

        render();
        publish();
        schedulePoll();
    }

    // Gives the item the words of the last reading. The app replaces the item that has the same id, so no field of an
    // older state stays on it: a `tone` of "warn" would stay with `update` alone (docs/extensions/reference/pocket.md,
    // "Adding to the app", and "StatusSpec" for the fields).
    function render() {
        if (reading === null || !present.status) {
            return;
        }

        // The folder is no OpenSpec project: the item is removed, not emptied (design.md decision 8). A reading that
        // failed is not that case, because the item must say why instead, until a reading is good again (spec.md, "A
        // failure keeps the last reading and says why").
        if (reading.project === null && reading.error === null) {
            item?.remove();
            item = null;
            return;
        }

        item = pocket.status({ id: itemId, ...glanceOf(reading) });
    }

    // A panel draws again for each new reading. `publish` runs from `read`, which the app calls at a draw, from the
    // poll, from the refresh button, and from the `changed` event: never while a component draws
    // (docs/extensions/browser-modules.md, "Redraws").
    function subscribe(listener) {
        listeners.add(listener);

        return () => {
            listeners.delete(listener);
        };
    }

    function publish() {
        for (const listener of listeners) {
            listener(reading);
        }
    }

    // The panel's refresh button: 1 new reading of this conversation's route, and nothing else. It sends no message,
    // runs no command, and reads no other session (spec.md, "A person asks for a new reading"). The reading also
    // starts the poll over from 30 s, as any reading does.
    function refresh() {
        void read();
    }

    // The buttons of a change: each one puts its apply or archive command into the message box of the session, and the
    // person sends it or not. `insertText` is the only call here, so nothing is sent, and there is no explore, propose,
    // or verify button (task 6.1; spec.md, "The panel offers the change's next action as a message").
    function putInBox(text) {
        pocket.insertText(text);
    }

    /**
     * 1 change in the panel: its name and schema, its artifact marks, its task bar, its task groups, and its 2
     * skill-command buttons.
     */
    function ChangeRow({ change }) {
        const tasks = change.tasks ?? {};
        const counter = `${tasks.done ?? 0}/${tasks.total ?? 0}`;
        const artifacts = Array.isArray(change.artifacts) ? change.artifacts : [];
        const groups = Array.isArray(tasks.groups) ? tasks.groups : [];

        return html`<article class="oss-change">
            <div class="oss-head">
                <span class="oss-name mono">${change.name}</span>
                ${change.schema != null &&
                html`<span class="oss-schema small muted">${change.schema}</span>`}
            </div>
            ${artifacts.length > 0 &&
            html`<div class="oss-marks">
                ${artifacts.map(
                    (artifact) => html`<span
                        class="oss-mark"
                        data-status=${markStateOf(artifact)}
                        title=${`${artifact.id}: ${artifact.status ?? "no status"}`}
                    >
                        <span class="oss-dot"></span>
                        <span class="small mono">${artifact.id}</span>
                    </span>`
                )}
            </div>`}
            <div class="oss-progress">
                <div class="oss-bar" title=${`${counter} tasks done`}>
                    <div class="oss-bar-fill" style=${`width: ${percentOf(tasks)}%`}></div>
                </div>
                <span class="oss-count small mono">${counter}</span>
            </div>
            ${groups.length > 0 &&
            html`<ul class="oss-groups">
                ${groups.map(
                    (group) => html`<li class="oss-group" key=${group.title}>
                        <span class="oss-group-title small">${group.title}</span>
                        <span class="oss-group-count small mono">
                            ${`${group.done ?? 0}/${group.total ?? 0}`}
                        </span>
                    </li>`
                )}
            </ul>`}
            ${present.insertText &&
            html`<div class="oss-actions">
                <button
                    class="button oss-action"
                    onClick=${() => putInBox(`/skill:openspec-apply-change ${change.name}`)}
                    title=${`Puts /skill:openspec-apply-change ${change.name} in the message box, and sends nothing`}
                >
                    Apply
                </button>
                <button
                    class="button oss-action"
                    onClick=${() => putInBox(`/skill:openspec-archive-change ${change.name}`)}
                    title=${`Puts /skill:openspec-archive-change ${change.name} in the message box, and sends nothing`}
                >
                    Archive
                </button>
            </div>`}
        </article>`;
    }

    /**
     * What the panel shows: when the reading was made, whether it is stale, the refresh button, the command's words when
     * the reading failed, and each active change (design.md decision 7; spec.md, "The panel shows the detail of each
     * active change").
     */
    function StatusPanel() {
        const [shown, setShown] = useState(reading);

        useEffect(() => subscribe(setShown), []);

        const changes = Array.isArray(shown?.changes) ? shown.changes : [];
        const failed = shown?.error != null;
        const stale = staleOf(shown);

        return html`<div class="oss-panel">
            <div class="oss-top">
                <span class="small muted">
                    ${shown === null ? "no reading yet" : ageText(shown.at)}${stale && html`<span class="oss-stale"> stale</span>`}
                </span>
                <button class="button" onClick=${refresh}>Refresh</button>
            </div>
            ${shown === null && html`<p class="small muted">The first reading is on its way.</p>`}
            ${failed && html`<p class="oss-error small">${shown.error.message}</p>`}
            ${shown !== null &&
            changes.length === 0 &&
            !failed &&
            html`<p class="small muted">No active change.</p>`}
            ${changes.map(
                (change) => html`<${ChangeRow} key=${change.name} change=${change} />`
            )}
        </div>`;
    }

    if (present.panel) {
        // The stylesheet is in this module's folder, so no `<link>` of its own is needed
        // (docs/extensions/reference/pocket.md, "style").
        pocket.style("look.css");

        pocket.panel({ id: panelId, title: "OpenSpec", component: StatusPanel });
    }

    if (present.status) {
        // The item says only that the module is on, until the first reading arrives.
        item = pocket.status({
            id: itemId,
            text: "OpenSpec",
            short: "OpenSpec",
            title: "The OpenSpec project of this session's folder",
        });

    }

    // 1 new reading at once when the server says that this conversation may have changed. An event goes to each tab of
    // the module, so a tab reads only when the id is its own, and the route stays the truth (design.md decision 5).
    const stopChanged = pocket.on(changedEvent, (data) => {
        if (data === null || typeof data !== "object" || data.conversationId !== pocket.conversationId()) {
            return;
        }

        void read();
    });

    // The tab made no reading while it was hidden, so it makes 1 when it comes back. A tab that goes away also drops
    // the timer of this module, so nothing of it runs in a hidden tab.
    function onVisibilityChange() {
        if (tabHidden()) {
            stopPoll();
            return;
        }

        void read();
    }

    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
        document.addEventListener("visibilitychange", onVisibilityChange);
    }

    if (present.status || present.panel) {
        // 1 reading when the tab draws, and the poll starts there too (task 3.4).
        void read();
    }

    // The app runs what the default export returns when this version of the module goes, so the timer and the 2
    // listeners of this tab go with it (docs/extensions/browser-modules.md, "The default export").
    return () => {
        stopped = true;
        stopPoll();
        stopChanged();

        if (typeof document !== "undefined" && typeof document.removeEventListener === "function") {
            document.removeEventListener("visibilitychange", onVisibilityChange);
        }
    };
}
