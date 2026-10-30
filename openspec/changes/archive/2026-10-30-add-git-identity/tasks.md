# Tasks

## 1. The module and its settings

- [x] 1.1 Copy `extensions/_template` to `extensions/git-identity`, rename the file to `git-identity.ts`, and remove the
      template's tool and command. The default export returns `defineExtension({ name: "git-identity" })`. Write the
      comment at the top in full: what the module does, that it writes only `user.name` and `user.email` in the global
      git config through `git config --global`, that `--global` follows the server's `HOME`, and that a hand edit to that
      file is undone at the next session. Verify: `./scripts/link.sh` prints `link: /data/extensions/git-identity.ts -> …`
      and `./scripts/check.sh` prints `check.sh: 2 module(s) checked, exit code 0`.

- [x] 1.2 Replace `extensions/git-identity/README.md`, which is the template's instructions, with the module's own page:
      the 2 settings, the file it writes, and the 3 moments it writes. Verify: the page names `user_name`, `user_email`,
      and `~/.gitconfig`, and it repeats no step of the template.

- [x] 1.3 Declare the settings with `web.settings([...])`: `user_name` labelled `User name` and `user_email` labelled
      `Email`, each `type: "text"`, `default: ""`, a placeholder (`Ada Lovelace`, `ada@example.com`), and a description
      that says the value goes to the global git config. Add the guard: when `web.settings`, `host.on`, or `host.notice`
      is not a function, send 1 notice that names Pi Pocket 0.22.0, and install nothing. Verify: `./scripts/check.sh`
      prints exit code 0, and on a server without the settings API the notice names 0.22.0 and no extension installs.

- [x] 1.4 Turn the module on in Menu → Extensions, group **Yours**. Verify: the sheet shows `User name` and `Email` with
      their placeholders and descriptions, and both are empty.

## 2. The git write path

- [x] 2.1 Add the read: for each of `user.name` and `user.email`, run `execFile("git", ["config", "--global", "--get", key])`
      with a 5 second timeout. Exit code 1, or empty output, counts as missing. Export this function from the module so a
      check can call it. Verify, with a throwaway `HOME`: `cd /data/extensions && HOME=$(mktemp -d) node -e
      'import("/data/extensions/git-identity.ts").then(async m => console.log(await m.readGitIdentity()))'` prints both
      keys as missing, and `git config --global --list` with that `HOME` is still empty.

- [x] 2.2 Add the write: `execFile("git", ["config", "--global", "--replace-all", key, value])`, then read the key again
      and compare. Write only keys that differ from the setting. Verify, with the throwaway `HOME` of 2.1: after a
      write, `git config --global --get user.name` prints the value, and running the write a second time leaves one
      value (`git config --global --get-all user.name` prints 1 line). Then set the key twice by hand
      (`--add`), write again, and confirm exit code 0 and 1 value.

- [x] 2.3 Add the validation: trim each value; refuse a control character (`\u0000`–`\u001f`, `\u007f`), a `user_name`
      longer than 100 characters, a `user_email` longer than 254, and a `user_email` that does not match `x@y.z`. A
      refused value changes nothing and produces 1 warning. Verify, with the throwaway `HOME`: a 120-character name and
      `ada.example.com` as the email each give 1 warning, and `git config --global --get` shows the earlier values
      unchanged. Confirm that a name holding `"`, `#`, `=`, and `;` is written and read back exactly.

- [x] 2.4 Refuse to touch any other key. Verify: with the throwaway `HOME`, set `core.editor` to `vim` and
      `init.defaultBranch` to `main`, write the identity, and confirm both are exactly as they were.

## 3. The triggers, the notices, and the failures

- [x] 3.1 Run the comparison at 3 moments: once as the module loads, on `web.onSettings`, and on
      `host.on("session.created")` with the stop function passed to `web.onDispose`. Overlapping runs share 1 promise, so
      a burst of events runs git once. Verify: save the settings and confirm 1 info notice names `user.name` and
      `user.email`, and that both values appear in git; then edit `~/.gitconfig` by hand to another email, create a
      session, and confirm the email returns to the setting with 1 notice.

- [x] 3.2 Send the notice policy of the design: 1 notice per run — info when a value was written (naming the keys),
      warning when a value was refused, error with git's words when a write failed, and nothing when nothing changed.
      Verify: a save that changes nothing gives no notice; a read-only `~/.gitconfig` (`chmod 400` on the throwaway
      `HOME` copy) gives 1 error notice that quotes git.

- [x] 3.3 Latch a missing git: when `git` is not found (`ENOENT`), send 1 warning for the whole run of the server, and do
      no more work. Verify: run the exported function with `PATH=/nonexistent` and confirm 1 warning; call it again
      3 times and confirm no second notice.

- [x] 3.4 Keep the settings as the truth. Verify: with the throwaway `HOME`, set `user.email` in git to another address,
      then save the setting again, and confirm git holds the setting's value.

## 4. On the real machine

- [x] 4.1 Back up the real `~/.gitconfig` if it exists (`cp ~/.gitconfig ~/.gitconfig.bak`). Turn the module on in the
      owner's Pi Pocket and fill the real name and email. Verify: `git config --global --get user.name` and
      `git config --global --get user.email` print them, and a commit in a folder with no local config has the right
      author (`git -C /tmp/newrepo commit --allow-empty -m test` then `git log -1 --format='%an <%ae>'`).

## Workflow follow-up

- Commit the change artifacts on their own: `chore: add openspec change for git-identity`.
- Commit the module on its own, after `./scripts/check.sh` prints exit code 0: `feat: add git-identity`.
- Push only this branch: `git push origin HEAD`.
- After the first release, add the gallery entry to `index.entries.json`, with the `sha256` and size that
  Menu → Extensions → **Installed** → **Share…** gives, `minPocket: "0.22.0"`, and `declares` with no tools, no hooks,
  no routes, no commands, and `client: null`.
