# Design

## Context

See [proposal.md](proposal.md) for the problem. These facts shape the approach.

**The repository.** 1 module is 1 file, `extensions/<name>/<name>.ts`, in a folder of the same name. `scripts/check.sh`
type-checks each module against `/data/extensions/_pocket.d.ts` and must print exit code 0 before a commit.

**The API.** `web.settings`, `web.setting`, `web.onSettings`, and `host.on` came in Pi Pocket 0.22.0, and they are
experimental: they can change, or go, in any minor release. A module must check that each member is there, because a
module loads again while the server runs, but the host changes only when the server restarts.

**git, measured on this machine (2.39.5, no `~/.gitconfig`):**

| command | result |
| --- | --- |
| `git config --global --get user.name`, absent | exit 1, no output |
| value set to `""` | exit 0, empty output |
| `git config --global user.name X`, 2 values already there | exit 5, "cannot overwrite multiple values" |
| `--replace-all`, key absent | exit 0, creates it |
| `--replace-all`, key present | exit 0, replaces it |
| value `A "B" # C = D` | git writes it quoted, reads it back exactly |
| value with a line break | git writes `\n`, reads back a line break |

**Rights.** A module runs in the server, as the owner, and it may start processes (security model S1). It writes
`~/.gitconfig` and nothing else outside Pi Pocket (S1.1, S1.2), and its first comment says so.

## Goals / Non-Goals

**Goals:**

- Settings are the single source of truth. A copy in git is derived from them, and nothing is read back into them.
- Every write goes through `git`, so git owns the file format, the quoting, and the lock.
- The machine repairs itself: a deleted or edited global config returns to the settings without a save.
- The owner hears each outcome once, and hears nothing when nothing happened.

**Non-Goals:**

- A local repository's `.git/config`, and any per-work identity. `includeIf` and a repo's own config still win over
  the global values, because that is how git reads config.
- Every other git key: signing key, editor, default branch, credential helper.
- Reading `~/.gitconfig` into the form. The settings are the truth, so git is never the input.
- A tool, a command, a route, or a browser module.

## Decisions

### D1. `web.settings`, not a browser sheet

The form is Pi Pocket's own settings form in Menu → Extensions.

| option | files | owner can see git's value | prefill from git |
| --- | --- | --- | --- |
| `web.settings` (chosen) | 1 | no | not possible: there is no setter |
| browser sheet + owner route | 2 to 3 | yes | yes |

The chosen option wins because the owner asked for the settings form to be the source of truth: a form that also shows
git would invite a second source. It also keeps the module to 1 file, which `scripts/check.sh` covers. The price is
accepted knowingly: the form never shows what git holds.

### D2. All writes go through `git config --global --replace-all`

The module passes an argument array to `execFile("git", [...])`, never a shell string, and never writes the config text.

- `--replace-all` is 1 code path: it creates an absent key and replaces a present one, and it survives the duplicate
  keys that a dotfiles merge leaves behind (a plain write exits 5 there).
- git quotes `"`, `#`, `=`, `;`, and `\` itself, so the module does no escaping of its own.
- git takes `~/.gitconfig.lock`, so 2 writers serialize instead of losing a write.

Rejected: `--add` (grows duplicates), replacing a regexp (needs quoting of the key), `--unset-all` then write (2 writes
where 1 does, and a window with no value).

### D3. An empty setting is not an instruction

A blank or whitespace-only setting is skipped. It never removes a key from git. So the default state — both fields
empty, module just turned on — changes nothing, and clearing a field cannot delete an identity the machine has.

### D4. "A missing value" means: exit code 1, or empty output

`--get` prints nothing and exits 1 when the key is absent. A key set to `""` exits 0 with empty output, and that counts
as missing too, so the module writes a real value over it.

### D5. Triggers: load, settings save, session created — no timer

- load: covers turning the module on, and a server restart.
- `web.onSettings`: the save, the case the owner asked for.
- `host.on("session.created")`: covers a git config that changed after the load. The spec asks for the next session to
  restore it, so this check is not throttled.

A check costs 2 short `git` runs (a few milliseconds each). Overlapping triggers share 1 run through a single-flight
promise, so a burst of sessions does not spawn a burst of git. No `setInterval`: nothing here is worth a timer, and
`web.onDispose(host.on(...))` is enough to stop listening when the module goes.

### D6. One notice per run, from `host.notice`

An `onSettings` listener that throws only reaches the log, so the notice is the owner's only feedback. Therefore:

| outcome | notice |
| --- | --- |
| 1 or 2 values written | `info`, names the keys written |
| a value refused by validation | `warning`, names the field and the rule |
| a write failed | `error`, with the words git printed |
| nothing to write | none |
| `git` not found | `warning`, once per server run (latched) |

A refused value does not stop the other key: the run writes what is valid, then tells the owner about the rest.

### D7. Validation lives in the module

The form is a text field with a 4096 character limit, which is far longer than git wants. Before a value goes to git:
trim it; refuse it if it holds a control character (`\u0000`–`\u001f`, `\u007f`), if `user_name` is longer than 100
characters, if `user_email` is longer than 254, or if `user_email` does not have the shape `x@y.z`. The module checks
the shape, not the truth: a valid-looking typo is written as typed.

Rejected: believing the form, because a control character in a name is not a name, and a line break in a commit author
line is a broken commit.

### D8. A version guard at load, and no `pocketApi` export

The default export checks `typeof web.settings === "function"` and `typeof host.on === "function"` first. When one is
missing, it sends 1 notice that names 0.22.0 and returns without installing anything. No tool of this module returns
`output`, so the module needs no `pocketApi` export at all: an absent `pocketApi` means version 1, and the real floor is
`minPocket 0.22.0`, which the gallery entry carries later.

### D9. Read back after each write

After `--replace-all`, the module reads the key again and compares it with the value it wrote. Inside an `onSettings`
listener there is no other way to know that the write landed. A mismatch is reported as a failure with the value git
holds.

## Risks / Trade-offs

- **A hand edit to `~/.gitconfig` is undone at the next session.** → This is the chosen semantics. The module's first
  comment, the settings descriptions, and the gallery entry each say so in 1 sentence.
- **The form cannot show what git holds.** → Accepted, see D1. A future version can add a read-only status route or
  tool without a change to the specs.
- **A typo in an address is written as typed.** → The module checks shape only. The owner's own commits show the
  address, so the mistake is visible where it matters.
- **The server's `HOME` is the one that `--global` writes to.** If Pi Pocket runs in a container, that is the
  container's `HOME`, not the person's laptop. → The module writes where git points, and the settings form serves the
  same machine as the server. This is worth 1 sentence in the module's first comment.
- **The settings API is experimental.** → The load-time guard (D8) and the `minPocket` field keep an older or newer
  server from breaking quietly.
- **A `git` run per session costs time.** → Measured at a few milliseconds, and shared by single-flight. If it ever
  matters, a memo can throttle it, but the specs ask for a check at each session.
- **`includeIf` and a repo's own config still win.** → Not a defect: git's own order. The module sets the machine
  default only.

## Migration Plan

Nothing to migrate: the module is new, and a new module starts off. To roll back, the owner turns it off in
Menu → Extensions, or removes `extensions/git-identity` and runs `scripts/link.sh` again. Values already written stay
in `~/.gitconfig`; that is the owner's to keep or to change.

## Open Questions

- Should a later version add a read-only tool, so Pi can answer "is my git identity set, and from where?" This does not
  change the specs, and it can wait.
- Should a later version offer the local repository's identity as a second scope? It would need a per-session story,
  which this change deliberately leaves out.
