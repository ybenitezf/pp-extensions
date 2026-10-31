---
name: extension-dropin
description: Install, update, or remove one of this repository's extensions in Pi Pocket's drop-in folder, extensions/ in Pi Pocket's data folder, by a copy and never by a link. Use when a person asks to install, update, uninstall, or remove an extension module of this repository in Pi Pocket for a test, or when a module must be reloaded in Pi Pocket after an edit.
---

Put 1 module of this repository into Pi Pocket's drop-in folder, `extensions/` in Pi Pocket's data folder, and take it
out again. The procedure is a copy in and a copy out. It is never a link.

This file has 2 playbooks. They do not depend on each other. Read only the one that the person asked for.

## Facts that both playbooks use

- The module is `extensions/<name>/<name>.ts`. The name is the module's folder name and its file name, for example
  `git-identity`.
- The browser part of a module is the folder `extensions/<name>/<name>/`. When it exists, it goes to
  `"$dropin/<name>/"`.
- Ownership is proven by bytes, and not by a marker file and not by a ledger file. Do not make a marker file, such as
  `<name>.dev.json`. Do not keep a list of what you copied.
- The drop-in folder, `"$dropin"`, belongs to Pi Pocket. Do not touch `_pocket.d.ts`. Do not touch `node_modules`. Do not
  touch a module that this repository does not hold, such as `subscription-usage` or a `<name>.gallery.json`.
- Pi Pocket watches the drop-in folder, `"$dropin"`, and it does not watch the folders below it. A write to
  `"$dropin/<name>/index.js"` alone gives no event. A write to a top-level entry gives 1 event. Thus a copy of the
  module file is what makes Pi Pocket load the new code.
- A drop-in is **off** only when Pi Pocket holds no earlier choice for its file name. The on/off state is keyed to the
  file name, and Pi Pocket keeps it in `config.json`, in its data folder: `~/.pi-pocket`, or the folder that
  `PI_POCKET_DIR` or `--data` gives. A module that goes in again under the same name comes back with its earlier
  choice, so it can already be **on**. Only the owner turns a module on or off, in Menu → Extensions.
- **The drop-in folder is not a fixed path.** It is `extensions/` in Pi Pocket's data folder. Set it once, before any
  other command:

  ```bash
  dropin="${PI_POCKET_DIR:-$HOME/.pi-pocket}/extensions"
  ```

  Use `$HOME`, never `~`, inside the quotes, because `~` does not expand there. Use `:-`, not `-`, so that an empty
  variable also falls back. Every command in both playbooks uses `"$dropin"`.
- **Look before you write.** Run `test -d "$dropin"` before any write. When it exits not 0, stop and tell the person
  that the drop-in folder is not there, with the path that you tested. Do not make the folder.
- `web.client` may not be a symbolic link. Pi Pocket refuses a browser part that is a link. A copy is always a regular
  file or a regular folder.

## The ownership test

Run this command before you write or remove anything:

```bash
cmp -s extensions/<name>/<name>.ts "$dropin/<name>.ts"
```

Read the exit code:

| Situation | Exit code | What it means |
| --- | --- | --- |
| No file at `"$dropin/<name>.ts"` | not 0 | Nothing is in the way. Continue. |
| The 2 files are byte-equal | 0 | The copy is ours. Continue. |
| The 2 files have different bytes | not 0 | The copy is not ours. Stop. |

**If the file at the target path exists with different bytes, write nothing and remove nothing.** Report the conflict to
the person. Name the target path and say that the file is not byte-equal to the module. The person decides what happens
to that file. This rule keeps another person's extension safe.

A copied file stops proving as ours when somebody edits it in the drop-in folder. The remedy is simple: change the
module in this repository, then copy it again.

## Playbook 1: Install or update a module

An update is the same copy as an install. When the copy is already ours, the ownership test passes and the copy replaces
the old file.

1. **Name the module.** Set `<name>` to the module's folder name in `extensions/`. Confirm that
   `extensions/<name>/<name>.ts` exists.
2. **Make 1 list of the files to copy.** The list holds `extensions/<name>/<name>.ts`. Add
   `extensions/<name>/<name>/` when that folder exists. Add `extensions/<name>/_helper.ts` when that file exists: a
   `_helper.ts` file must travel with the module, because an import from outside the drop-in folder is refused. No module
   in this repository has a `_helper.ts` file today, and the rule is here for the first module that needs one.
   Never copy `README.md`. Never copy a `*.test.ts` file. `README.md` is for people, and a test file is not loaded.
3. **Run the ownership test** from "The ownership test" above. Stop on a difference and report the conflict.
4. **Look at the target path.** If `"$dropin/<name>.ts"` is a symbolic link, remove the link with `rm` and then
   continue. Remove the link only. The file that the link pointed at stays where it is. Do the same for a symbolic link
   at `"$dropin/<name>/"`.
5. **Copy the module file.** Copy `extensions/<name>/<name>.ts` to `"$dropin/<name>.ts"` with this command:

   ```bash
   cp extensions/<name>/<name>.ts "$dropin/<name>.ts"
   ```

   The result is a regular file, byte-equal to the module of this repository.
6. **Copy the browser part.** When `extensions/<name>/<name>/` exists, copy the folder to `"$dropin/<name>/"` with
   these 2 commands:

   ```bash
   mkdir -p "$dropin/<name>"
   cp -R extensions/<name>/<name>/. "$dropin/<name>/"
   ```

   Copy the module file together with the folder, always. Do not copy a browser file on its own: Pi Pocket sees no event
   for it, and the copy of the module file is what makes Pi Pocket reload and compute the new revision of the browser
   files.
7. **Confirm the copy.** Run the ownership test again. It must exit 0. Use `ls -l "$dropin/<name>.ts"` and
   `ls -l "$dropin/<name>/"` to confirm that each entry is a regular file or a regular folder and not a link.
8. **Tell the person 2 facts.** First, the module is copied in, and it gets the earlier on/off choice of its file name: a
   name with no earlier choice is **off**, and a module that the owner turned on before can be **on**. Second, the choice
   is the owner's: the owner turns the module on, or confirms that it is on, in Menu → Extensions. Do not say that the
   module runs. Do not wait for it to run.

After an edit in this repository, repeat this playbook. An edit reaches the server only when the module is copied again.
No watcher does the copy for you: Pi Pocket watches its drop-in folder, and this repository watches nothing. The copy
is a step of this playbook.

## Playbook 2: Uninstall a module

This playbook removes the module that the install playbook copied, and nothing else. It puts the drop-in folder back to
the state that it had before the install. It does not change the on/off choice, which Pi Pocket keeps in its own
settings.

1. **Name the module.** Set `<name>` to the module's folder name in `extensions/`. Confirm that
   `extensions/<name>/<name>.ts` exists. When this repository does not hold the module, stop: the module is not ours.
2. **Run the ownership test** from "The ownership test" above. The test works also when a different session did the
   install. Stop on a difference and report the conflict.
3. **Remove the browser part.** When `"$dropin/<name>/"` exists, remove that folder, because the install playbook
   copied it, with this command:

   ```bash
   rm -r "$dropin/<name>"
   ```

   Do not remove a file in it that this repository does not hold. When `"$dropin/<name>/"` does not exist, the
   module has no browser part. Remove nothing in this step, and continue with step 4.
4. **Remove the module file.** Remove `"$dropin/<name>.ts"` with this command:

   ```bash
   rm "$dropin/<name>.ts"
   ```

   Remove it only when the ownership test passed in step 2.
5. **Leave the rest as it is.** Do not remove `_pocket.d.ts`. Do not remove `node_modules`. Do not remove a
   `<name>.gallery.json`. Do not remove any module that this repository does not hold.
6. **Confirm the result.** `"$dropin/<name>.ts"` and `"$dropin/<name>/"` are gone. The drop-in folder holds
   what Pi Pocket had before the install, and the module's entry is gone from Menu → Extensions.
7. **Tell the person** what you removed, and that the rest of the folder is unchanged.

## What this skill does not do

- It does not make a symbolic link, and it does not point at a script that does.
- It does not write into this repository, and it does not copy a file out of the drop-in folder.
- It does not install from the gallery and it does not publish. The gallery keeps its own sidecar and its own update
  path.
- It does not add a cleanup step to Playbook 1. Removal is the whole job of Playbook 2.
