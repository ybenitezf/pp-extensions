# The template

Copy this folder for each new extension. Do not turn the template on: Pi Pocket does not load a file that starts with
`_`, and `scripts/link.sh` skips this folder.

## What to change in the copy

1. **The folder name and the file name.** Give both the name of your module: `extensions/<name>/<name>.ts`. Use lowercase
   letters, digits, `-`, and `_`. The name must not start with `pocket-`, and it must not be the name of a built-in
   module. The two names must be the same, or `scripts/link.sh` skips the file.
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

Then run `scripts/link.sh` and `scripts/check.sh`, and turn the module on in Menu → Extensions, group **Yours**. The
steps are in [docs/adding-an-extension.md](../../docs/adding-an-extension.md).

## What to leave as it is

- The import of the types: `import type { Web } from "./_pocket.d.ts";`. When `scripts/link.sh` links the module,
  `_pocket.d.ts` is beside it in the drop-in folder.
- The import of the packages by name: `@earendil-works/pi-ai` and `@earendil-works/pi-durable`. The drop-in folder has
  a `node_modules` link to them.
- `export default` on the function that returns `defineExtension`. Pi Pocket calls that function when it loads the
  module.
