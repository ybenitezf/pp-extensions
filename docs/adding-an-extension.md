# Adding an extension

This page gives the steps to add 1 extension to this repository. Each extension is 1 module: 1 `.ts` file in its own
folder. The rules for the modules are in [AGENTS.md](../AGENTS.md).

Use `<name>` below for the name of your extension: lowercase letters, digits, `-`, and `_`, such as `my-words`. It does
not start with `pocket-`, and it is not the name of a built-in module of Pi Pocket.

To put a module into Pi Pocket and to take it out again, use the skill
[`.agents/skills/extension-dropin/SKILL.md`](../.agents/skills/extension-dropin/SKILL.md). The skill holds 2 playbooks:
**Playbook 1: Install or update a module** and **Playbook 2: Uninstall a module**. A module reaches Pi Pocket's
drop-in folder, `/data/extensions`, as a copy. It never reaches it as a link. `/data/extensions` belongs to Pi Pocket.

## 1. Copy the template

```sh
cd extensions
cp -r _template <name>
```

## 2. Rename the file and change the names

```sh
git mv extensions/<name>/_template.ts extensions/<name>/<name>.ts
```

The folder name and the file name must be the same. Then open `extensions/<name>/<name>.ts` and change the names in it:
the comment at the top, `extensionName`, `toolName`, and `commandName`. The list is in
[the template's README](../extensions/_template/README.md). Do not change the import of `./_pocket.d.ts`, and do not
change `pocketApi = 2` while a tool of the module returns `output`.

## 3. Install it into Pi Pocket

Read [`.agents/skills/extension-dropin/SKILL.md`](../.agents/skills/extension-dropin/SKILL.md) and do
**Playbook 1: Install or update a module**. The playbook gives the steps that put the module into `/data/extensions`:
that folder belongs to Pi Pocket, and only Pi Pocket loads the module. The procedure is a copy of
`extensions/<name>/<name>.ts` to `/data/extensions/<name>.ts`. It is never a link. Do not commit anything in
`/data/extensions`.

After you change a module in this repository, do Playbook 1 again. A change reaches Pi Pocket only with a new copy.

## 4. Turn the module on

Open Menu → Extensions in Pi Pocket. Your module is in the group **Yours**, and it is off. Turn it on. Pi Pocket loads
the module and shows it in the sheet, with its description, its tools, and its routes. When the load fails, the sheet
shows the error.

## 5. Check the module

```sh
./scripts/check.sh
```

The script type-checks each module against `/data/extensions/_pocket.d.ts` with `npx tsc --noEmit`, in a temporary
folder, and prints the exit code. Exit code 0 means that each module is correct. When the exit code is not 0, the check
prints the errors, with their file and line.

## 6. Commit

```sh
git add extensions/<name>
git commit -m "feat: add <name>"
```

Run `./scripts/check.sh` before each commit. Push only the branch that you are on: `git push origin HEAD`.

## After the first release

The gallery entry of a published extension goes in `index.entries.json`. That file is a draft now: it has the wrapper,
`{"format": 1, "extensions": []}`, and 1 example entry with each field that a gallery entry needs. Get the entry of
your extension from Menu → Extensions → **Installed** → **Share…**: it gives the size and the SHA-256 of each file. Then
replace the example entry, and read the page **Publishing to the gallery** in the Pi Pocket documentation for the rules.
