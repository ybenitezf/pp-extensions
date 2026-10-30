# The template

Copy this folder for each new extension. Do not turn the template on: Pi Pocket does not load a file that starts with
`_`. Copy the folder and never link it.

A module reaches Pi Pocket's drop-in folder as a copy, and never as a link. The skill
[`.agents/skills/extension-dropin/SKILL.md`](../../.agents/skills/extension-dropin/SKILL.md) holds the procedure.

## What to change in the copy

1. **The folder name and the file name.** Give both the name of your module: `extensions/<name>/<name>.ts`. Use lowercase
   letters, digits, `-`, and `_`. The name must not start with `pocket-`, and it must not be the name of a built-in
   module. The two names must be the same, or Pi Pocket does not load the module.
2. **The comment at the top of `_template.ts`.** Its first sentence says what the module does. Pi Pocket shows it in
   Menu → Extensions, and the gallery uses it as the entry's description.
3. **`extensionName`.** The name of the extension that the module installs. Use a prefix of your own, such as
   `my-example`.
4. **`toolName`.** The name of the tool. It must not be the name of a built-in tool, such as `read` or `bash`.
5. **`commandName`.** The name of the command. It needs lowercase letters, digits, `-`, and `_`, with one `-` at least.
   Pi Pocket refuses a command that the app or another module has.
6. **`description`**, in the tool and in the command. Say what they do, in one sentence.
7. **`pocketApi = 2`.** Keep the line while a tool of the module returns `output`, because that needs version 2 of the
   extension API.

Then put the module into Pi Pocket. Read
[`.agents/skills/extension-dropin/SKILL.md`](../../.agents/skills/extension-dropin/SKILL.md), **Playbook 1: Install or
update a module**, and do the steps in it. After that, run `scripts/check.sh`, and turn the module on in
Menu → Extensions, group **Yours**. The other steps are in
[docs/adding-an-extension.md](../../docs/adding-an-extension.md).

## What to leave as it is

- The import of the types: `import type { Web } from "./_pocket.d.ts";`. Pi Pocket keeps `_pocket.d.ts` in the drop-in
  folder, beside the module. Do not copy it there, and do not remove it.
- The import of the packages by name: `@earendil-works/pi-ai` and `@earendil-works/pi-durable`. The drop-in folder
  gives these packages to the module. Do not touch `node_modules`.
- `export default` on the function that returns `defineExtension`. Pi Pocket calls that function when it loads the
  module.
