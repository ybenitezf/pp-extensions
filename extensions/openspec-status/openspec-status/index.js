// The browser part of openspec-status: it draws 1 status item and 1 panel from the module's route, and polls the route.

// 1, not 2: this module uses nothing that version 2 added, so it loads on Pi Pocket 0.18 too.
export const pocketApi = 1;

const itemId = "status";

const panelId = "detail";

// 40: the app cuts `text` and `short` past 40 characters to 39 and "…", so this module keeps to the same limit.
const textLimit = 40;

// The fallback poll: 30 s while a reading changes something, 30 s more each time that it does not, up to 120 s.
const pollStartMs = 30_000;
const pollStepMs = 30_000;
const pollMaxMs = 120_000;

const staleMs = 60_000;

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

/** What 1 reading says without the time: 2 equal signatures mean nothing changed, and the poll grows. */
function signatureOf(reading) {
    return reading === null ? "" : JSON.stringify([reading.project, reading.changes, reading.error]);
}

/** The item's words for 1 reading of the route, as a `StatusSpec`. */
function glanceOf(reading) {
    const error = reading.error ?? null;

    // The `openspec` command is not on the machine. This comes before the project check: no command means no project to name.
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

    // The item keeps the numbers of the last good reading, marked with the command's own words; with no earlier good
    // reading there is nothing to keep, so it says that the reading failed.
    return changes.length === 0
        ? { text: "OpenSpec failed", short: "failed", title: error.message, tone: "warn" }
        : { ...glance, tone: "warn", title: error.message };
}

/** Whether the numbers on screen are not from now: the reading failed after a good 1, or it is more than 1 minute old. */
function staleOf(reading) {
    if (reading === null) {
        return false;
    }

    const kept = Array.isArray(reading.changes) && reading.changes.length > 0;

    if (reading.error != null && kept) {
        return true;
    }

    const time = Date.parse(reading.at ?? "");

    return Number.isFinite(time) && Date.now() - time > staleMs;
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

/** The state of 1 artifact: "done", "ready", or "blocked"; a state that this module does not know shows the quiet mark. */
function markStateOf(artifact) {
    const status = artifact?.status;

    return status === "done" || status === "blocked" ? status : "ready";
}

/** When the reading was made, in words: "read just now", "read 40 s ago", "read 3 min ago", "read 2 h ago". */
function ageText(at) {
    const time = Date.parse(at ?? "");

    if (!Number.isFinite(time)) {
        return "read at an unknown time";
    }

    const seconds = Math.max(0, Math.round((Date.now() - time) / 1000));

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

/** Which buttons 1 change gets, and its muted line: the 4 states come from the change's own spec delta. */
function actionOf(change) {
    const tasks = change.tasks ?? {};
    const artifacts = Array.isArray(change.artifacts) ? change.artifacts : [];
    const apply = Array.isArray(change.apply) ? change.apply : [];
    const total = typeof tasks.total === "number" ? tasks.total : 0;
    const done = typeof tasks.done === "number" ? tasks.done : 0;
    const written = artifacts.some((artifact) => artifact?.status === "done");

    // Every artifact that `apply` names is done. No name at all means that no requirement is unmet.
    const ready = apply.every((id) =>
        artifacts.some((artifact) => artifact?.id === id && artifact?.status === "done")
    );

    // Nothing is written yet: no artifact is done and there is no task line.
    if (!written && !(total > 0)) {
        return { apply: false, archive: false, note: "nothing to act on yet" };
    }

    // There is no task line, and not every artifact that `apply` names is done: the case with no `tasks.md`.
    if (!(total > 0) && !ready) {
        return { apply: false, archive: true, note: "no tasks yet" };
    }

    // There is work in the change, and every task line of it is checked.
    if (total > 0 && done === total) {
        return { apply: false, archive: true, note: "all tasks done" };
    }

    return { apply: true, archive: true, note: null };
}

export default function setup(pocket) {
    // The status item, the panel, and `insertText` came in 0.19.0 and are experimental: an older app has none, so
    // this module does nothing there instead of throwing at its first use.
    const present = {
        status: typeof pocket.status === "function",
        panel: typeof pocket.panel === "function",
        insertText: typeof pocket.insertText === "function",
    };

    if (!present.status && !present.panel) {
        return;
    }

    const { html, useState, useEffect } = pocket;

    // The last answer of the route, `{ project, changes, at, error }`.
    let reading = null;

    let item = null;

    // The `setShown` of each opened panel.
    const listeners = new Set();

    let pollMs = pollStartMs;
    let lastSignature = "";
    let pollTimer = null;
    let stopped = false;

    // A hidden tab draws by a short timer and makes no reading, so nothing here runs a reading while it is hidden.
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
    // the conversation id: the server finds the project root and checks that the person may see that session.
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
            // No session, no route, or no answer at all. The last reading stays on screen and goes stale, and the poll
            // goes on at the same wait, because this reading said nothing about a change.
            schedulePoll();
            return;
        }

        const signature = signatureOf(reading);

        pollMs = signature === lastSignature ? Math.min(pollMaxMs, pollMs + pollStepMs) : pollStartMs;
        lastSignature = signature;

        render();
        publish();
        schedulePoll();
    }

    // Gives the item the words of the last reading. The app replaces the item that has the same id, so no field of an
    // older state stays on it: a `tone` of "warn" would stay with `update` alone.
    function render() {
        if (reading === null || !present.status) {
            return;
        }

        // The folder is no OpenSpec project: the item is removed, not emptied. A reading that failed is not that case,
        // because the item must say why instead, until a reading is good again.
        if (reading.project === null && reading.error === null) {
            item?.remove();
            item = null;
            return;
        }

        item = pocket.status({ id: itemId, ...glanceOf(reading) });
    }

    // `publish` runs from `read`, never while a component draws.
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

    // The buttons of a change put their skill command into the message box with `insertText`, and nothing else: no
    // message is sent, no command is run, and no other session is read.

    /** 1 change in the panel: its name, schema, artifact marks, task bar, task groups, and its skill-command buttons. */
    function ChangeRow({ change }) {
        const action = actionOf(change);
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
                ${action.apply &&
                html`<button
                    class="button oss-action"
                    onClick=${() => pocket.insertText(`/skill:openspec-apply-change ${change.name}`)}
                    title=${`Puts /skill:openspec-apply-change ${change.name} in the message box, and sends nothing`}
                >
                    Apply
                </button>`}
                ${action.archive &&
                html`<button
                    class="button oss-action"
                    onClick=${() => pocket.insertText(`/skill:openspec-archive-change ${change.name}`)}
                    title=${`Puts /skill:openspec-archive-change ${change.name} in the message box, and sends nothing`}
                >
                    Archive
                </button>`}
                ${action.note !== null && html`<span class="oss-note">${action.note}</span>`}
            </div>`}
        </article>`;
    }

    /** The panel: the reading's age and staleness, the refresh button, the error, and each active change. */
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
                <button class="button" onClick=${() => void read()}>Refresh</button>
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
        pocket.style("look.css");

        pocket.panel({ id: panelId, title: "OpenSpec", component: StatusPanel });
    }

    if (present.status) {
        item = pocket.status({
            id: itemId,
            text: "OpenSpec",
            short: "OpenSpec",
            title: "The OpenSpec project of this session's folder",
        });
    }

    // 1 new reading at once when the server says that this conversation may have changed. An event goes to each tab of
    // the module, so a tab reads only when the id is its own.
    const stopChanged = pocket.on(changedEvent, (data) => {
        if (data === null || typeof data !== "object" || data.conversationId !== pocket.conversationId()) {
            return;
        }

        void read();
    });

    // The tab made no reading while it was hidden, so it makes 1 when it comes back.
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

    // 1 reading at once when the tab draws, and the poll starts there too.
    void read();

    // The app runs what the default export returns when this version of the module goes, so the timer and the 2
    // listeners of this tab go with it.
    return () => {
        stopped = true;
        stopPoll();
        stopChanged();

        if (typeof document !== "undefined" && typeof document.removeEventListener === "function") {
            document.removeEventListener("visibilitychange", onVisibilityChange);
        }
    };
}
