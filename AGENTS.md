# Rules for Pi sessions in this repository

This repository holds the source of several Pi Pocket extensions. Pi Pocket loads them from its drop-in folder,
`/data/extensions`, through the links that `scripts/link.sh` makes. These rules apply to every Pi session that works
here.

## Module rules

- **1 `.ts` file per module.** The module is `extensions/<name>/<name>.ts`: its own folder, and the folder name is the
  same as the file name. A helper that starts with `_` and a test file that ends in `.test.ts` are not modules.
- **Names in lowercase, with `-` and `_`.** The module's name, its extension name, its tool names, and its command names
  have lowercase letters, digits, `-`, and `_` only. An extension or tool name starts with a letter or a digit.
- **No name that starts with `pocket-`.** Pi Pocket keeps those names, and it does not load a module that takes one.
  Give each extension, tool, and command a prefix of your own, such as `my-example` and `my_example_count`.
- **`pocketApi = 2` when a tool returns `output`.** A tool that returns `output` needs version 2 of the extension API.
  A Pi Pocket before 0.18 does not load such a module. Export the constant at the top level of the module.
- **Run `scripts/check.sh` before each commit.** The script type-checks each module against
  `/data/extensions/_pocket.d.ts`, and it must print exit code 0.
- **Do not push to a branch that is not the current branch.** Push only the branch that you are on, as
  `git push origin HEAD`. Do not force-push, and do not push another branch.

## Files of the repository

```
extensions/<name>/<name>.ts   the modules
extensions/_template/         the template: copy it, never turn it on, never link it
scripts/link.sh               links each module into /data/extensions
scripts/check.sh              type-checks each module
docs/adding-an-extension.md   the steps to add 1 extension
index.entries.json            the draft list of gallery entries
```

- Do not commit the links in `/data/extensions`, and do not commit `node_modules`.
- Do not delete a file that another person added. Ask first.
- Do not change files in `/app`, which belongs to Pi Pocket.
- Read [Adding an extension](docs/adding-an-extension.md) before you add a module. Read the Pi Pocket documentation in
  `/app/docs/extensions/` before you use a part of the extension API for the first time.

## Commits

- One change of one module in one commit.
- Write the message in the form `feat: add <name>`, `fix: <what>`, or `chore: <what>`.
