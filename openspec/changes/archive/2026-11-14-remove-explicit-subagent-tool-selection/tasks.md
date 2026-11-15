# Tasks

## 1. Update the prompt

- [x] 1.1 Replace the opening paragraph in `ORCHESTRATOR_PROMPT` with the exact requested wording; verify it no longer requires explicit child-tool selection and still states file-change permission and path limits.
- [x] 1.2 Run `scripts/check.sh` and verify it exits with code 0.
- [x] 1.3 Copy the edited module into Pi Pocket's drop-in folder using `.agents/skills/extension-dropin/SKILL.md`; verify the copied file matches the repository module.
