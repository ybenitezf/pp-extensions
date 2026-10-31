# Tasks

## 1. Remove the stale link

- [x] 1.1 Confirm `/data/extensions/git-identity.ts` is a symbolic link that points outside this repository
      (`test -L`, `readlink -f`), remove it with `rm /data/extensions/git-identity.ts`, and verify afterwards that
      `ls -l /data/extensions/git-identity.ts` finds nothing while
      `/data/worktrees/pp-extensions-546de2/extensions/git-identity/git-identity.ts` still exists untouched
- [x] 1.2 Verify Pi Pocket has dropped it: the module is gone from Menu → Extensions, and the server's notice says the
      drop-in was removed

## 2. The skill

- [x] 2.1 Write `.agents/skills/extension-dropin/SKILL.md` with the Agent Skills frontmatter (`name: extension-dropin`,
      a description that states what it does and when it applies) and the 2 playbooks, install/update and uninstall, as
      the design describes; verify the frontmatter is valid (name lowercase with hyphens and at most 64 characters,
      description at most 1024) and that the file names both playbook headings
- [x] 2.2 Run the install playbook by hand for `git-identity`: verify `/data/extensions/git-identity.ts` is a regular
      file (`test -L` fails) that is byte-equal to the module (`cmp -s`), and that Menu → Extensions lists it as off
- [x] 2.3 Turn `git-identity` on in Menu → Extensions and verify the module runs (its settings and its notice appear), so
      that the copy is a working install and not only a file
- [x] 2.4 Run the uninstall playbook by hand and verify the drop-in folder is as it was: `git-identity.ts` is gone, the
      module's entry is gone from Menu → Extensions, and `/data/extensions` still holds `_pocket.d.ts`, `node_modules`,
      and `subscription-usage` with its folder and sidecar

## 3. Point the pages at the skill

- [x] 3.1 Replace the link steps in `docs/adding-an-extension.md` (the "use" part and step 3) with a pointer to the
      skill, and verify the page no longer tells anyone to run a script
- [x] 3.2 Update `README.md`: the "Use an extension" commands, the "Add an extension" steps, and the file list; verify no
      mention of a link script remains
- [x] 3.3 Update `extensions/_template/README.md` where it names the link script and the linked module, and verify the
      text points at the skill instead
- [x] 3.4 Update `AGENTS.md`: the intro sentence, the file list, and 1 rule that names the skill as the way a module
      reaches `/data/extensions`, and that `/data/extensions` belongs to Pi Pocket; verify the rule is short and names
      no script
- [x] 3.5 Update the project context in `openspec/config.yaml`, which still says that Pi Pocket loads a module "through
      the links that `scripts/link.sh` makes"; verify the sentence describes the copy instead

## 4. Remove the obsolete script

- [x] 4.1 Delete `scripts/link.sh` with `git rm`; verify that `grep -rn "link.sh" --include=*.md --include=*.yaml .`
      finds nothing outside `openspec/changes/` and the archived changes

## 5. Checks

- [x] 5.1 Run `openspec validate add-dropin-install-skill --strict` and verify it passes
- [x] 5.2 Run `./scripts/check.sh` and verify exit code 0, so that the template and every module still type-check
- [x] 5.3 Verify the repository holds no copy of the steps: `grep -rn "cp .*extensions/" --include=*.md .` finds the
      playbooks in the skill only

## Workflow follow-up

- Archive the change after the owner reviews it, and confirm that the archive copies `specs/dropin-install/spec.md` into
  `openspec/specs/dropin-install/spec.md`.
- Commit in the order of the groups, with `chore:` messages, since no module changes in this change.
