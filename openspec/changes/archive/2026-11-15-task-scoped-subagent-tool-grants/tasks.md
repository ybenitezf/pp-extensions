# Tasks

## 1. Update and verify the orchestrator prompt

- [x] 1.1 Replace the omit-`tools` and blanket retry instructions in `ORCHESTRATOR_PROMPT` with the confirmed rules: every spawn has a minimal explicit grant, including read-only work; spawn a new child when the grant changes; allow at most one corrected task-level retry on the same model; stop and report model/provider failures. Verify the prompt contains each rule and no longer directs Pi to omit `tools` or retry every failure.
- [x] 1.2 Run `scripts/check.sh` and verify it exits 0. Copy the edited module again by following `.agents/skills/extension-dropin/SKILL.md`, then verify the drop-in copy matches the repository module.
