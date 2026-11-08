# Tasks

## 1. Update the gate lists

- [x] 1.1 Remove `schedule` and `watch_pr` from `EXPLICITLY_BLOCKED_TOOLS` and verify neither name remains in that set
- [x] 1.2 Add `schedule` and `watch_pr` to `ALLOWED_TOOLS` and verify both names appear in that set

## 2. Document the rule

- [x] 2.1 Update `extensions/orchestrator-mode/README.md` with the target rule and its reason and verify the text names the allowed and blocked tools

## 3. Verify and ship

- [x] 3.1 Run `scripts/check.sh` and verify it prints exit code 0
- [x] 3.2 Copy the module into the drop-in folder with the skill `.agents/skills/extension-dropin/SKILL.md` and verify the copy is present
- [x] 3.3 Commit the change as `fix: allow schedule and watch_pr in orchestrator mode` and verify the commit succeeds
