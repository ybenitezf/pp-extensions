# openspec-status

Shows the OpenSpec project of the session's folder in Pi Pocket: a status item under the message box for the glance,
and a panel beside the conversation for the detail. The module only reads, and it runs 2 read-only commands.

Install: copy `openspec-status.ts` and the folder `openspec-status/` into the drop-in folder, `$PI_POCKET_DIR/extensions`
(or `~/.pi-pocket/extensions` when `PI_POCKET_DIR` is not set), with Playbook 1 of
`.agents/skills/extension-dropin/SKILL.md`. Turn it on in Menu → Extensions.

## What it shows

1 **status item** under the message box, id `status` (`ext:openspec-status:status`), and 1 **panel** beside the
conversation, id `detail`, title `OpenSpec`. The item gives the change's name and its task counter `done/total` for 1
active change, the count of changes and the summed counter for several (`3 changes · 12/20`), `no active change · 0/0`
for an OpenSpec project that holds no active change, `OpenSpec command not found` in the warning tone when the command
is absent, and `OpenSpec failed` in the warning tone when a reading failed and there is no earlier number to keep. The
app cuts an item's text past 40 characters, and the module cuts its own text at the same limit. The panel shows, for
each active change: the change's name (in `mono`), its schema, 1 mark for each artifact as a dot plus the artifact's id
(done is `var(--ok)`, ready is `var(--muted)`, blocked is `var(--warn)`), a task bar sized by the share of done tasks
with the counter `done/total` beside it, and each `##` group of `tasks.md` with its own counter. Above the changes it
shows when the reading was made (`read just now`, `read 40 s ago`, `read 3 min ago`, `read 2 h ago`), marks the numbers
`stale` in the warning tone when they are more than 1 minute old or come from an earlier good reading, shows the
command's own words when a reading failed, and gives a `Refresh` button. The styles are in `look.css`, which uses only
the tokens `--text`, `--muted`, `--line`, `--ok`, and `--warn`, and is drawn at a phone's width first.

## What it runs on the machine

A reading runs exactly 2 commands on the server, in the session's folder and never in a shell:

| Command | Limit | Why |
| --- | --- | --- |
| `git rev-parse --show-toplevel` | 5 seconds | the project root, when the session's folder holds no `openspec/changes/` |
| `openspec status --all --json` | 10 seconds | the 1 reading of the project: its active changes, their artifacts, their apply list |

Both go through 1 runner, `execFile` with an argument array and `shell: false`, so no change name and no folder name can
become a second command. The runner never throws: a command that is absent, too slow, or gone answers with words for a
person. A missing `openspec` answers kind `not-found` with the words
`openspec command not found on this machine (ENOENT)`; a command that ran past its limit answers
`openspec command did not answer within 10000 ms, so it was stopped`; a non-zero exit keeps the command's own words, its
standard error first and then its standard output. Both commands are read-only, and the module writes no OpenSpec file.

- **Lancet Guard does not see these 2 commands**, because the module starts them itself and not through Pi's `bash`
  tool. The module's description says that it runs `openspec` read-only, so read the code against that description.
- The module also exports `openSpecVersion`, which runs `openspec --version` within 5 seconds. The reading never calls
  it: it is there for a check without a live session.

## Where it reads

The browser sends only the session's id; the server does the reading.

- The browser part polls `GET status/<conversationId>` through `pocket.api`. The module registers that path as the route
  `GET status/:source`, a `conversationRoute` with `{ conversation: "source" }`, so the app finds the session and checks
  that the person may see it before the handler runs. No request can name a folder.
- The route answers `{ project, changes, at, error }`: `project` is `null` when the folder is no OpenSpec project,
  `changes` has 1 entry for each active change, `at` is the time of the reading, `error` is `null` or the reason.
- The browser part is registered with `web.client("openspec-status")`, which resolves the folder `openspec-status/`
  beside the module file: `index.js` draws, and `look.css` styles.
- **The project root**: the session's folder when it holds `openspec/changes/`; else the top level of its git
  repository when that holds `openspec/changes/`; else no project. The answer is remembered per folder for the life of
  the server process, and a folder that found no project is asked again at its next reading, so a person who adds
  `openspec/` while the session is open is seen at once.
- **The task counter and the task groups are read from disk**, from `openspec/changes/<name>/tasks.md`, because the CLI
  answer holds neither (see `## Fields the module needs`). A group opens at a line that starts with `## `; a task is a
  line `- [x] …` or `- [ ] …`, and only the line with the box counts; a `###` heading does not open a group; a group
  that holds no checkbox line is left out; text before the first `## ` is no group. At most 200 groups are read, and at
  most 1,000 checkbox lines are counted in each group. A `tasks.md` that is missing or cannot be read gives `0/0` and no
  group, which is no failure.
- **The server keeps 1 short-lived cache**, keyed by project root, for 2 seconds: 2 tabs of 1 session, or 2 sessions in
  the same folder, share 1 reading. A good reading made less than 2 seconds ago is answered again without a 2nd run, and
  a reading with an error is never answered from that window. When a reading fails after a good 1, the route answers the
  good reading's `project`, `changes`, and `at` with the new `error` beside them.

## When it reads

- **Once when the tab draws**, then on a fallback timer: 30 seconds while a reading changed something, 30 seconds more
  each time that it did not, and 120 seconds at most. A reading that changes the answer sets the timer back to 30
  seconds.
- **At once** when the server sends the `changed` event of this conversation, and at once when a person uses the panel's
  `Refresh` button.
- **Never while the tab is hidden.** The tab reads 1 time when it becomes visible again.
- **The triggers on the server**: `host.on("run.ended")`, a `write` or an `edit` whose `path` holds an `openspec`
  segment, and a `bash` command whose text contains `openspec`. Each one is debounced 500 ms per conversation, and then
  the server sends `changed` with `{ conversationId }`. An event cannot be addressed to 1 conversation, so it is only a
  nudge: each tab re-reads when the id is its own, and the route stays the truth.

## The 4 states

| State | Status item | Panel |
| --- | --- | --- |
| 1 active change | `<name> · <done>/<total>` | that change's schema, artifact marks, task bar and counter, each `##` group with its counter |
| Several active changes | `<n> changes · <done>/<total>`, the counter summed over every change | 1 block for each change, each with its own marks and progress |
| The `openspec` command is not found | `OpenSpec command not found`, warning tone | the words `openspec command not found on this machine (ENOENT)`, and no change row |
| The folder is no OpenSpec project | no item at all: it is removed, not emptied | `No active change.`, and no change row |

The last state is the answer `project: null` with `error: null`, which the CLI gives with `root.source === "implicit"`
(see `## The 3 cases the module must tell apart`). The 2nd panel row of the last state comes from the browser part's own
rule for an empty `changes` list, so a project with no active change shows the same words with a good reading.

## Checked in Pi Pocket

With the module turned on in Pi Pocket, each state was checked in a live session and confirmed by the owner. Folders are
named by a word and not by a path of a machine.

| State | Where the session's folder was | The item's exact text | What the panel showed |
| --- | --- | --- | --- |
| 1 active change | `<repository root>` | `add-openspec-status · 5/18`, then `9/18`, then `11/18`, then `12/18` as other work ticked the tasks | the change, its schema, the 4 artifact marks, the task bar, and the 6 task groups |
| Several active changes | `<throwaway project with 2 changes>` | `2 changes · 13/22`, which is `12/18` plus `1/4` summed | 1 block for each of the 2 changes |
| The `openspec` command is not found | `<repository root>` | `OpenSpec command not found` | `openspec command not found on this machine (ENOENT)`, with the reading marked `stale` |
| A failed command | `<repository root>` | not noted | the stand-in's own words `openspec: cannot read openspec/changes: boom`, with `stale`, and the earlier change rows stayed |
| A project with no active change | `<project with no active change>` | `no active change · 0/0` | not noted |
| A folder that is no OpenSpec project | `<folder that is no project>` | no item: it was removed | the muted line `No active change.` |

2 checks put the command itself out of order, and both were restored. The `openspec` command was first removed from the
PATH of the server process, which gave the `not found` row above, and the item then read `OpenSpec command not found`; the
command was then put back as its original link and checked by its hash. Next it was replaced by a stand-in that exited
`1`, which gave the failed-command row above; the command was put back again and checked. After the restore the item
returned to `add-openspec-status · 11/18`, so the module recovers from both failures without a restart.

2 more facts were confirmed live. A change to a `tasks.md` reached the open tab almost at once, which is the `changed`
event path and not the 30-second poll. The 1st poll step was watched over several minutes, and the owner confirmed that
`3.4` works as intended.

1 imperfection is known and not fixed: in a folder that is no OpenSpec project the item is removed as it should be, but
the panel still shows its muted line `No active change.` instead of saying that the folder is not an OpenSpec project.

### The 2 checks that ran by substitute

The literal command of tasks 2.5 and 2.6 could not run on the machine that held the module. Each check below states what
the task asked to run, why that exact command could not run, and what was run instead with its result.

**Task 2.5** — the route `GET status/:source`, read with `curl` on 2 sessions.

- **Asked to run:** `curl -H 'X-Pocket: 1'` on a session that holds a change, and on one that does not.
- **Why it did not run:** the Pi Pocket server answers `401 {"error":"Sign in first"}` to every module path, including a
  path that does not exist, before it routes the request. A `curl` from outside the app therefore reaches no module
  route. A signed-in session cookie would have made it work, and that was refused on purpose.
- **What ran instead:** `<the app's own request>`, from the browser part of the module, in both cases. The owner saw both
  results: a session that holds a change showed `add-openspec-status · 14/18` in `<the status item>` and the change's
  rows in the panel, and a session in a folder of `<general>` that is no OpenSpec project showed no status item.

**Task 2.6** — the triggers, watched in the server log.

- **Asked to run:** 10 events within 1 second, and the server log read to show that the module sends `changed` 1 time.
- **Why it did not run:** the machine has no readable server log. The server process writes to standard output only, and
  no log file of it can be read.
- **What ran instead:** a test stub that fired `run.ended` 10 times within about 1 second, and the module sent `changed`
  exactly 1 time. A foreign conversation produced 0 sends, and a write outside `openspec/` and a `bash` call that does
  not mention `openspec` each produced 0 sends. In the live app a change of a task counter reached the open tab almost
  at once, which the 30-second poll cannot explain.

The owner accepted the substitute for both checks. Task 6.1, the action buttons, is delivered, and the check of
them in the app is recorded below.

### The action buttons

Each change in the panel gives exactly 2 buttons, `Apply` and `Archive`. `Apply` puts
`/skill:openspec-apply-change <name>` into the session's message box, and `Archive` puts
`/skill:openspec-archive-change <name>` into it. The row wraps at a phone's width and nothing is cut.

- A tap on `Apply` was checked in the app: the message box then held
  `/skill:openspec-apply-change add-openspec-status`, the conversation did not move, and nothing was sent. A tap on
  `Archive` was not checked on its own.
- There is no explore, propose, or verify button. `explore` is a session-wide mode and `propose` starts a new change,
  so neither acts on 1 change, and this repository has no `verify` skill.

## Sample of the CLI answer

`openspec status --all --json`, run in the root of this repository, a folder that holds exactly 1 active change
(`add-openspec-status`). The output below is that answer, cut with `...` where a block is long and not needed for this
module, and with each folder path replaced by a word in `<…>` so that this file names no folder of any machine. With the
`...` in place it is not valid JSON; every line that is not a `...` line is otherwise verbatim.

```json
{
  "changes": [
    {
      "changeName": "add-openspec-status",
      "schemaName": "spec-driven",
      "planningHome": {
        ...
      },
      "changeRoot": "<repository root>/openspec/changes/add-openspec-status",
      "artifactPaths": {
        ...
      },
      "isPlanningComplete": true,
      "isComplete": true,
      "applyRequires": [
        "tasks"
      ],
      "nextSteps": [
        "All planning artifacts are complete. Run openspec instructions apply --change \"add-openspec-status\" --json to inspect implementation progress."
      ],
      "actionContext": {
        ...
      },
      "artifacts": [
        {
          "id": "proposal",
          "outputPath": "proposal.md",
          "status": "done",
          "requires": []
        },
        {
          "id": "specs",
          "outputPath": "specs/**/*.md",
          "status": "done",
          "requires": [
            "proposal"
          ]
        },
        {
          "id": "design",
          "outputPath": "design.md",
          "status": "done",
          "requires": [
            "proposal"
          ]
        },
        {
          "id": "tasks",
          "outputPath": "tasks.md",
          "status": "done",
          "requires": [
            "specs",
            "design"
          ]
        }
      ]
    }
  ],
  "root": {
    "path": "<repository root>",
    "source": "nearest"
  }
}
```

Both commands exit 0 in this folder.

## Fields the module needs

1 row for each field: the field, its JSON path in the `--all` answer, and whether the answer has it.

| Field the module needs | JSON path in the `--all` answer | In the `--all` answer |
| --- | --- | --- |
| change name | `changes[].changeName` | present |
| schema | `changes[].schemaName` | present |
| artifact list | `changes[].artifacts[]` | present |
| status of each artifact | `changes[].artifacts[].status` | present |
| id of each artifact, used as its label | `changes[].artifacts[].id` | present |
| apply list | `changes[].applyRequires` | present |
| task counter: complete | no key | **missing** |
| task counter: total | no key | **missing** |
| task groups, each with its own counter | no key | **missing** |

Notes:

- `changes[].artifacts[].status` carries `done`, and the same key is where a `ready` or `blocked` artifact shows its
  state; `changes[].artifacts[].requires` gives the artifact's own dependencies.
- The answer carries more keys that this module does not need: `changes[].planningHome`, `changes[].changeRoot`,
  `changes[].artifactPaths`, `changes[].isPlanningComplete`, `changes[].isComplete`, `changes[].nextSteps`,
  `changes[].actionContext`, and the top-level `root`.
- No key in the answer gives a task counter or a task group, so the module reads `tasks.md` from disk for both, as
  `design.md` decision 2 says. The count is the checkbox lines that start with `- [x]` against all checkbox lines.

## The `--change <name>` fallback

`openspec status --change "add-openspec-status" --json` gives 12 top-level keys: the 11 keys of 1 row of the `--all`
answer, with the change as the top-level object (`changeName`, `schemaName`, `applyRequires`, `artifacts[]` with
`status` for each, and the rest), plus the top-level `root`.
The fallback does **not** give a task counter, because that key is missing from both forms, so a reading of `tasks.md` on
disk is necessary with either form.

`design.md` decision 2 names that command as the fallback for a row of the `--all` answer that lacks a field. This
version of the module does not call it: the 1 reading runs `openspec status --all --json` and no `--change` command, and
the test of the 2 forms above is 1 of the facts that make `--all` enough. A row whose field is missing keeps the module's
own default instead: no name drops the change, no schema shows no schema, and no artifact status reads as `ready`.

## The 3 cases the module must tell apart

All 3 commands were run on this machine with `openspec` 1.15.0. Every one of them exited 0 and wrote nothing to
stderr, so a non-zero exit is **not** what tells the 3 cases apart: the JSON keys are. The answer of case 1 is the
sample above, which is verbatim apart from its `...` cuts and its `<…>` path words; the answers of cases 2 and 3 are
quoted in full below.

| Case | Exact exit code | Exact words of the answer | JSON key that shows the case |
| --- | --- | --- | --- |
| 1. OpenSpec project with 1 or more active changes, run in the root of this repository | `0` | the sample in `## Sample of the CLI answer` above, whose 1 row holds `"changeName": "add-openspec-status"`, and whose last key is `"root": { "path": "<repository root>", "source": "nearest" }` | `changes[]` is not empty; `changes[].changeName` names the change |
| 2. OpenSpec project with no active change, run in a temporary folder after `openspec init` | `0` | verbatim in the block below: `"changes": []`, `"message": "No active changes."`, `"source": "nearest"` | `root.source` is `"nearest"`, because an `openspec/` folder was found |
| 3. Not an OpenSpec project (no `openspec/` folder, no git repository), run in a temporary folder | `0` | verbatim in the block below: `"changes": []`, `"message": "No active changes."`, `"source": "implicit"` | `root.source` is `"implicit"`, because no `openspec/` folder was found and the folder itself became the root |

Case 2, exact stdout of `openspec status --all --json` in the folder that `openspec init` made (exit code 0, stderr
empty, and the path word replaced):

```json
{
  "changes": [],
  "message": "No active changes.",
  "root": {
    "path": "<temporary folder>",
    "source": "nearest"
  }
}
```

Case 3, exact stdout of `openspec status --all --json` in a folder with no `openspec/` folder and no git repository
(exit code 0, stderr empty, and the path word replaced):

```json
{
  "changes": [],
  "message": "No active changes.",
  "root": {
    "path": "<other temporary folder>",
    "source": "implicit"
  }
}
```

Notes:

- The 2 answers differ in 1 key only: `root.source`, `"nearest"` against `"implicit"`. `"implicit"` is what makes
  case 3 case 3, so the module must read `root.source` and must not treat an empty `changes` list as "no project".
- Case 3 carries no error and no exit code that differs from case 1, so the module cannot use the exit code for this.
  `root.source`, or the `stat(<root>/openspec/changes)` of `design.md` decision 4, is the only way.
- The top-level keys of the 3 answers: case 1 has `["changes","root"]`, and cases 2 and 3 have
  `["changes","message","root"]`. The `message` key `"No active changes."` is there in both of the empty cases, so
  it also does not tell them apart.
- The module answers an answer with no `root.source` at all as a failed reading with the words
  `openspec status answered no root.source, so the reading is unclear`, and never as a project.

## The 2 limitations

1. **Pi Pocket 0.26.0 or later.** The module needs `web.conversationRoute` for the reading and `host.on` for the
   triggers, and the browser part needs `pocket.status` and `pocket.panel`, which came in 0.19.0 as experimental
   members. On an older app the server side gives 1 warning that names the missing members and installs nothing, and the
   browser part draws neither the item nor the panel.
2. **The `openspec` command must be on the machine's PATH for the server process.** The module runs it itself, so the
   PATH that the server got (a service may have one that differs from a shell's) is the one that counts. Without the
   command there is no project to show: the item says `OpenSpec command not found` in the warning tone. The `git`
   command is needed too, but only to find the project root of a session that runs in a subfolder: without `git` the
   module still shows a project that the session's own folder holds.

## Known narrow behaviours

- **A tab that loads while it is hidden makes 1 reading.** The browser part reads 1 time when the tab draws, and its
  poll then plans nothing while the tab is hidden, so no 2nd reading follows until the tab becomes visible.
- **A failed reading with no earlier number shows only the error words.** When the route answers an error with an empty
  `changes` list, and the server's 2-second cache holds no earlier good reading of that project root, the panel shows
  the command's words and no change row, and the item says `OpenSpec failed` in the warning tone. A failed reading after
  a good 1 keeps the good numbers instead, marked `stale`.
