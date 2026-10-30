/**
 * Keeps the machine's git identity in step with 2 settings: `User name` and `Email`.
 *
 * What it does: the owner fills the 2 settings in Menu → Extensions → this module. The module then writes them to the
 * global git config, so every commit on this machine carries that name and that address. The settings are the only
 * source of truth: git is never read back into the form.
 *
 * What it writes: `user.name` and `user.email` in the global git config, and nothing else, through the command
 * `git config --global`. It never edits a config file itself. Git writes the file, so git owns the file format, the
 * quoting, and the lock.
 *
 * Where that is: `--global` writes the file that git finds through the `HOME` of the server process, usually
 * `~/.gitconfig`. When Pi Pocket runs in a container, that file is the container's, not the file of the person's own
 * laptop.
 *
 * A hand edit to that file is undone at the next session: the module writes the 2 settings again when a session
 * starts, so a value changed by hand comes back to what the settings say.
 */
import { execFile } from "node:child_process";
import { defineExtension } from "@earendil-works/pi-durable";
import type { Host, NoticeLevel, Web } from "./_pocket.d.ts";

// The names of this module. They are here, in one place, so that a copy is easy to rename.
const extensionName = "git-identity";

// The oldest Pi Pocket that this module works with: it needs `web.settings`, `host.on`, and `host.notice` (0.22.0).
const neededPocket = "Pi Pocket 0.22.0";

/** How long 1 git run may take, in milliseconds. A `git config` run on a small file takes a few milliseconds. */
const gitTimeoutMs = 5_000;

/**
 * The 2 keys of the global git config that this module may write: the allowlist (task 2.4).
 *
 * Every function below takes a `GitKey` and no bare string, so no other key can reach git, and the write checks the key
 * against this list once more before it runs `git`.
 */
const identityKeys = ["user.name", "user.email"] as const;

/** 1 key of the allowlist: `user.name` or `user.email`. */
type GitKey = (typeof identityKeys)[number];

/** One of the 2 settings, the git key that it fills, and the rules of its value (design D7). */
interface IdentityField {
    /** The key of the global git config. */
    readonly key: GitKey;
    /** The name of the setting that the owner fills in. */
    readonly setting: "user_name" | "user_email";
    /** The label of the setting, as the notice names it. */
    readonly label: string;
    /** The longest value that git gets, in characters. */
    readonly maxLength: number;
    /** The shape that the value must match, when there is one. */
    readonly shape: RegExp | undefined;
}

/** The shape of an address, `x@y.z`: the module checks the shape, not the truth of the address. */
const addressShape = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** A control character: a line break, a tab, a null, or any other that is not a character of a name. */
const controlCharacters = /[\u0000-\u001f\u007f]/;

const identityFields: readonly IdentityField[] = [
    { key: "user.name", setting: "user_name", label: "User name", maxLength: 100, shape: undefined },
    { key: "user.email", setting: "user_email", label: "Email", maxLength: 254, shape: addressShape },
];

/** What git printed, and its exit code. A code of `null` means that git did not run at all, as when it is not found. */
interface GitRun {
    readonly code: number | null;
    readonly stdout: string;
    readonly stderr: string;
    /** The error code of a git that did not start: `ENOENT` when there is no `git` on this machine, else `null`. */
    readonly spawnError: string | null;
}

/** The value of the 2 keys now: the value, or `null` when the key is missing or holds `""` (design D4). */
export interface GitIdentity {
    readonly "user.name": string | null;
    readonly "user.email": string | null;
}

/** What 1 run of the git layer did, for the notice that the next work unit adds. */
export interface IdentityRunReport {
    /** The keys that this run wrote and read back with the setting's value. */
    readonly written: readonly GitKey[];
    /** The keys whose setting value a rule refused. */
    readonly refused: readonly GitKey[];
    /** The keys whose write, or read-back, failed. */
    readonly failed: readonly GitKey[];
}

/** Sends 1 notice to the owner. `syncGitIdentity` gives the host's own `notice`. */
export type Notify = (level: NoticeLevel, message: string) => void;

/**
 * The latch for a `git` that is not on this machine (task 3.3, design D6).
 *
 * It is state of the module, not of 1 run: the first run that finds no `git` sends 1 warning, and every run after it does
 * nothing at all, until the server restarts and this module loads again from the start.
 */
let gitMissing = false;

/** True once the owner heard the 1 warning about a missing `git`, so that no later run sends a second. */
let gitMissingNoticed = false;

/**
 * Latches the module off when `run` means that git is not on this machine, and says whether it did.
 *
 * Only `ENOENT` counts: a git that ran and exited non-zero, and a git that took too long, are ordinary failures that 1
 * run reports with git's own words, and the next run tries again.
 */
function latchMissingGit(run: GitRun): boolean {
    if (run.spawnError !== "ENOENT") {
        return false;
    }
    gitMissing = true;
    return true;
}

/**
 * Runs git with an argument array, never a shell string, and gives back what it printed.
 *
 * It always resolves: a non-zero exit code, a timeout, and a `git` that is not found all come back as a `GitRun`, so a
 * caller decides what they mean and nothing throws.
 */
async function runGit(args: readonly string[]): Promise<GitRun> {
    return await new Promise<GitRun>((resolve) => {
        execFile(
            "git",
            [...args],
            { timeout: gitTimeoutMs, windowsHide: true, encoding: "utf8" },
            (error, stdout, stderr) => {
                const out = typeof stdout === "string" ? stdout : "";
                const err = typeof stderr === "string" ? stderr : "";
                if (error === null) {
                    resolve({ code: 0, stdout: out, stderr: err, spawnError: null });
                    return;
                }
                // A number is an exit code. Anything else, such as `ENOENT`, is a git that did not run.
                const code = (error as { code?: unknown }).code;
                resolve({
                    code: typeof code === "number" ? code : null,
                    stdout: out,
                    stderr: err === "" ? error.message : err,
                    spawnError: typeof code === "string" ? code : null,
                });
            },
        );
    });
}

/** What a read of 1 key gave: its value, and the news that git is not on this machine (task 3.3). */
interface GitKeyRead {
    /** The value, or `null` when the key is missing, holds `""`, or the read failed (design D4). */
    readonly value: string | null;
    /** True when git did not start at all, which latches this module off. */
    readonly missingGit: boolean;
}

/**
 * Reads 1 key of the global git config. Exit code 1, or empty output, counts as missing (design D4).
 *
 * The key must be 1 of the allowlist.
 */
async function readGitKey(key: GitKey): Promise<GitKeyRead> {
    const run = await runGit(["config", "--global", "--get", key]);
    if (latchMissingGit(run)) {
        return { value: null, missingGit: true };
    }
    if (run.code !== 0) {
        return { value: null, missingGit: false };
    }
    // `--get` ends the value with 1 line break, which is not part of the value.
    const value = run.stdout.endsWith("\n") ? run.stdout.slice(0, -1).replace(/\r$/, "") : run.stdout;
    return { value: value === "" ? null : value, missingGit: false };
}

/**
 * Reads `user.name` and `user.email` from the global git config (task 2.1).
 *
 * A missing key, an empty value, a git that is not found, and a git that fails all give `null`, so this function does
 * not throw on a machine with no global config.
 */
export async function readGitIdentity(): Promise<GitIdentity> {
    const [name, email] = await Promise.all([readGitKey("user.name"), readGitKey("user.email")]);
    return { "user.name": name.value, "user.email": email.value };
}

/** The value of a setting as trimmed text: a value that is not text counts as empty. */
function trimmedSetting(values: Readonly<Record<string, string>>, setting: string): string {
    const value = values[setting];
    return typeof value === "string" ? value.trim() : "";
}

/** What the rules say about 1 value: the value to write, nothing to do, or the rule that refused it. */
type Verdict =
    | { readonly kind: "write"; readonly value: string }
    | { readonly kind: "skip" }
    | { readonly kind: "refuse"; readonly rule: string };

/**
 * Checks 1 setting value against the rules of its field (task 2.3, design D7).
 *
 * An empty or whitespace-only value is not an instruction: it is skipped, and git is left alone (design D3).
 */
function checkValue(field: IdentityField, values: Readonly<Record<string, string>>): Verdict {
    const value = trimmedSetting(values, field.setting);
    if (value === "") {
        return { kind: "skip" };
    }
    if (controlCharacters.test(value)) {
        return { kind: "refuse", rule: "it holds a control character" };
    }
    if (value.length > field.maxLength) {
        return { kind: "refuse", rule: `it is longer than ${field.maxLength} characters` };
    }
    if (field.shape !== undefined && !field.shape.test(value)) {
        return { kind: "refuse", rule: "it is not an address in the shape x@y.z" };
    }
    return { kind: "write", value };
}

/** The words that git printed, for the error notice: its `error:` or `fatal:` line, else 1 line, else the exit code. */
function gitWords(run: GitRun): string {
    const lines = run.stderr
        .split("\n")
        .map((part) => part.trim())
        .filter((part) => part !== "");
    const worst = lines.find((part) => part.startsWith("error:") || part.startsWith("fatal:"));
    const line = worst ?? lines[0];
    if (line !== undefined) {
        return line;
    }
    return run.code === null ? "git did not run" : `git exited with code ${run.code}`;
}

/** What 1 write did: it landed and read back, git printed an error, or git is not on this machine (task 3.3). */
type WriteOutcome =
    | { readonly kind: "written" }
    | { readonly kind: "failed"; readonly words: string }
    | { readonly kind: "missing-git" };

/**
 * Writes 1 value with `git config --global --replace-all`, then reads the key back and compares (tasks 2.2 and 2.4).
 *
 * `--replace-all` is 1 code path: it creates an absent key and replaces a present one, and it clears the duplicate keys
 * that a hand edit or a dotfiles merge leaves behind. The module does no quoting of its own: git writes the file, so
 * git quotes `"`, `#`, `=`, `;`, and `\`.
 *
 * This function says nothing to the owner: it gives back what happened, and `applyGitIdentity` turns the outcomes of 1
 * run into its 1 notice (task 3.2).
 */
async function writeGitKey(key: GitKey, value: string): Promise<WriteOutcome> {
    // The allowlist, once more, right before git runs.
    if (!identityKeys.includes(key)) {
        return { kind: "failed", words: `it is not a key that this module writes` };
    }
    const run = await runGit(["config", "--global", "--replace-all", key, value]);
    if (latchMissingGit(run)) {
        return { kind: "missing-git" };
    }
    if (run.code !== 0) {
        return { kind: "failed", words: gitWords(run) };
    }
    const readBack = await readGitKey(key);
    if (readBack.missingGit) {
        return { kind: "missing-git" };
    }
    if (readBack.value !== value) {
        const held = readBack.value === null ? "no value" : `"${readBack.value}"`;
        return { kind: "failed", words: `git read back ${held} instead` };
    }
    return { kind: "written" };
}

/** 1 value that a rule refused: the label of its setting, and the rule that refused it (design D7). */
interface Refusal {
    readonly label: string;
    readonly rule: string;
}

/** 1 write that failed: the key, and what git said about it, or what git read back instead (design D9). */
interface Failure {
    readonly key: GitKey;
    readonly words: string;
}

/** What 1 run of the git layer did, as the notice policy reads it. */
interface RunOutcomes {
    readonly written: readonly GitKey[];
    readonly refusals: readonly Refusal[];
    readonly failures: readonly Failure[];
    /** True when git is not on this machine. */
    readonly missing: boolean;
}

/** The keys as 1 list of words: `user.name`, or `user.name and user.email`. */
function keyList(keys: readonly GitKey[]): string {
    if (keys.length === 1) {
        return keys[0] as string;
    }
    return `${keys.slice(0, -1).join(", ")} and ${keys[keys.length - 1] as string}`;
}

/**
 * The notice policy of 1 run (task 3.2, design D6): 1 notice at most, and its level from the worst outcome.
 *
 * `error` first, then `warning`, then `info`, and nothing at all when no value changed. A warning names every refused
 * field and its rule, and it still names the keys that this run did write. A missing `git` sends 1 warning for the whole
 * run of the server, and no run after it says anything again.
 */
function noticeRun(notify: Notify, outcomes: RunOutcomes): void {
    if (outcomes.missing) {
        if (!gitMissingNoticed) {
            gitMissingNoticed = true;
            notify(
                "warning",
                `${extensionName} did not find git on this machine, so it wrote nothing. It will not try again until Pi Pocket restarts.`,
            );
        }
        return;
    }
    if (outcomes.failures.length > 0) {
        const parts = outcomes.failures.map((failure) => `${extensionName} could not write ${failure.key}: ${failure.words}`);
        notify("error", `${parts.join(". ")}.`);
        return;
    }
    if (outcomes.refusals.length > 0) {
        const clauses = outcomes.refusals.map((refusal) => `did not write ${refusal.label}: ${refusal.rule}`);
        const kept = outcomes.refusals.length === 1 ? "Git keeps the value that it has." : "Git keeps the values that it has.";
        const wrote =
            outcomes.written.length > 0
                ? ` It wrote ${keyList(outcomes.written)} to the global git config.`
                : "";
        notify("warning", `${extensionName} ${clauses.join(", and ")}. ${kept}${wrote}`);
        return;
    }
    if (outcomes.written.length > 0) {
        notify("info", `${extensionName} wrote ${keyList(outcomes.written)} to the global git config.`);
    }
}

/**
 * The git layer: for each of the 2 settings, validate the value, write the key when it differs, and read it back.
 *
 * It is exported so that a check can call it, and so that the 3 triggers have 1 function to run.
 *
 * A value that a rule refuses changes nothing, and it does not stop the other key (design D6): the run writes what is
 * valid, then tells the owner about the rest in its 1 notice. A failed write gives 1 error with git's own words. A `git`
 * that is not found latches the module off (task 3.3): no later run calls git, and no later run sends a notice.
 */
export async function applyGitIdentity(
    values: Readonly<Record<string, string>>,
    notify: Notify = () => {},
): Promise<IdentityRunReport> {
    const written: GitKey[] = [];
    const refused: GitKey[] = [];
    const failed: GitKey[] = [];
    const refusals: Refusal[] = [];
    const failures: Failure[] = [];
    let missing = false;

    // The latch: after 1 run found no git, this module does no more work and says nothing more (task 3.3).
    if (!gitMissing) {
        for (const field of identityFields) {
            const verdict = checkValue(field, values);
            if (verdict.kind === "skip") {
                // A blank setting is not an instruction: it never unsets a key (design D3).
                continue;
            }
            if (verdict.kind === "refuse") {
                refused.push(field.key);
                refusals.push({ label: field.label, rule: verdict.rule });
                continue;
            }
            const current = await readGitKey(field.key);
            if (current.missingGit) {
                missing = true;
                break;
            }
            if (current.value === verdict.value) {
                // The key already holds the setting's value: no write, and nothing to notice.
                continue;
            }
            const outcome = await writeGitKey(field.key, verdict.value);
            if (outcome.kind === "missing-git") {
                missing = true;
                break;
            }
            if (outcome.kind === "written") {
                written.push(field.key);
                continue;
            }
            failed.push(field.key);
            failures.push({ key: field.key, words: outcome.words });
        }
    }

    noticeRun(notify, { written, refusals, failures, missing });

    return { written, refused, failed };
}

/**
 * The 1 place where this module talks to the owner. The policy is `noticeRun`: the level and the words of the 1 notice of
 * a run are decided there, not here.
 */
function notices(host: Host): Notify {
    return (level, message) => host.notice(level, message);
}

/** The value of 1 setting as text: a value that is not text counts as empty. The value is not trimmed here. */
function settingText(web: Web, name: string): string {
    const value = web.setting(name);
    return typeof value === "string" ? value : "";
}

/** Reads the 2 settings and gives them to the git layer. The 3 triggers of `createExtension` call this. */
async function syncGitIdentity(web: Web, host: Host): Promise<IdentityRunReport> {
    const values: Record<string, string> = {
        user_name: settingText(web, "user_name"),
        user_email: settingText(web, "user_email"),
    };
    return await applyGitIdentity(values, notices(host));
}

/** True when `value` can be called: the check that a module uses for the API members that came in 0.22.0. */
function isFunction(value: unknown): value is (...args: never[]) => unknown {
    return typeof value === "function";
}

export default function createExtension(host: Host, web: Web): ReturnType<typeof defineExtension> {
    // The API guard. `web.settings`, `host.on`, and `host.notice` are experimental and came in 0.22.0, and the host
    // changes only when the server restarts, while a module loads again and again. So check each member here, before
    // anything is installed: on an older Pi Pocket the owner gets 1 notice, and nothing else happens.
    if (!isFunction(web.settings) || !isFunction(host.on) || !isFunction(host.notice)) {
        if (isFunction(host.notice)) {
            host.notice(
                "warning",
                `${extensionName} needs ${neededPocket}. This app is older, so the module did nothing.`,
            );
        }
        return defineExtension({ name: extensionName });
    }

    // The settings: Pi Pocket's own form in Menu → Extensions shows them, keeps the owner's values, and gives them back
    // with `web.setting`. Both start empty, and an empty value is not an instruction: it writes nothing.
    web.settings([
        {
            name: "user_name",
            label: "User name",
            type: "text",
            default: "",
            placeholder: "Ada Lovelace",
            description:
                "The value of user.name in the global git config (~/.gitconfig). Leave it empty to write nothing.",
        },
        {
            name: "user_email",
            label: "Email",
            type: "text",
            default: "",
            placeholder: "ada@example.com",
            description:
                "The value of user.email in the global git config (~/.gitconfig). Leave it empty to write nothing.",
        },
    ]);

    // The git layer is above: `readGitIdentity` reads the 2 keys, and `applyGitIdentity` validates a value, writes the
    // key with `--replace-all`, reads it back, and sends the 1 notice of the run. `syncGitIdentity` gives the 2 settings
    // to that layer.

    /** The run in flight, shared by the triggers of a burst (design D5). */
    let inFlight: Promise<IdentityRunReport> | null = null;

    /**
     * Runs the comparison, or joins the run that is already under way (task 3.1, design D5).
     *
     * A burst of triggers shares 1 promise, so the burst runs git once. It never rejects: the git layer turns every
     * failure into a report and a notice, and this guard turns a surprise into 1 error notice instead of a crash.
     */
    function trigger(): Promise<IdentityRunReport> {
        // No git on this machine: the latch stops all further work, and it has already sent its 1 warning (task 3.3).
        if (gitMissing) {
            return Promise.resolve({ written: [], refused: [], failed: [] });
        }
        if (inFlight !== null) {
            return inFlight;
        }
        const run = syncGitIdentity(web, host)
            .catch((error: unknown) => {
                const text = error instanceof Error ? error.message : String(error);
                notices(host)("error", `${extensionName} could not finish its check: ${text}`);
                return { written: [], refused: [], failed: [] };
            })
            .finally(() => {
                if (inFlight === run) {
                    inFlight = null;
                }
            });
        inFlight = run;
        return run;
    }

    // The 3 moments of task 3.1, each with no timer: the load of this module, a save in the settings form, and a new
    // session, which restores a global config that someone changed by hand. Each stop function goes to `web.onDispose`,
    // so turning the module off, or replacing it, stops every listener.
    void trigger();
    web.onDispose(
        web.onSettings(() => {
            void trigger();
        }),
    );
    web.onDispose(
        host.on("session.created", () => {
            void trigger();
        }),
    );

    return defineExtension({ name: extensionName });
}
