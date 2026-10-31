# Pi Pocket extensions

The extensions of [Pi Pocket](https://github.com/ybenitezf/pi-pocket) that I wrote. Each extension is 1 module in
TypeScript, and each module is 1 file.

Pi Pocket loads a module from its drop-in folder, `extensions/` in Pi Pocket's data folder. This repository keeps the
source of each module in its own folder. A module reaches the drop-in folder as a copy of the module file, and never as
a link. The skill `.agents/skills/extension-dropin/SKILL.md` gives that procedure.

## Use an extension

```sh
git clone git@github.com:ybenitezf/pp-extensions.git
cd pp-extensions
./scripts/check.sh         # type-checks each module
```

Next, put the module into the drop-in folder. Follow playbook 1 of the skill `.agents/skills/extension-dropin/SKILL.md`.
The skill copies the module file into the drop-in folder. Do not make a link.

Then open Menu → Extensions in Pi Pocket, and find the module in the group **Yours**. A module that the owner never
turned on is off, and only the owner of the Pi Pocket can turn it on. A module that went in before under the same name
comes back with its earlier choice, so it can already be on. Pi Pocket loads a new copy by itself, about 300 ms after
the copy, while the module is on.

## Add an extension

Read [docs/adding-an-extension.md](docs/adding-an-extension.md). It gives the 6 steps: copy `extensions/_template`, rename
it, copy the module into the drop-in folder with playbook 1 of the skill `.agents/skills/extension-dropin/SKILL.md`,
turn the module on, run `scripts/check.sh`, commit.

The rules for a module, and the rules for a Pi session that works in this repository, are in [AGENTS.md](AGENTS.md).

## The files

```
extensions/_template/         the template of a module, with a README of what to change in a copy
extensions/<name>/<name>.ts   the modules
.agents/skills/extension-dropin/SKILL.md
                              the copy-in and copy-out procedure for the drop-in folder
scripts/check.sh              type-checks each module against Pi Pocket's public types
docs/adding-an-extension.md   the steps to add 1 extension
index.entries.json            a draft list of gallery entries, in the format of Pi Pocket's gallery index
```

`index.entries.json` is a draft: the entry in it is an example. Its `source.commit` is a placeholder of 40 zeros, and its
file hashes are those of the template. Replace them when you publish an extension to the gallery.
