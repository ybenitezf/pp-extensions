# orchestrator-mode

This extension adds a durable per-conversation mode, a composer chip, the `/orchestrator-mode` command, and a conditional prompt for read-only orchestration.

**Rule:** While mode is on, only allowlisted inspection and delegation tools, plus custom tools marked read-only, can run. The orchestrator cannot change files or run `bash`; it must delegate changes to a subagent. The gate does not change the advertised tool list and is not a security boundary. The gate follows the TARGET of a tool call. A tool that acts only on the current conversation may proceed. A tool that acts on another session or on PiP stays blocked. `schedule` and `watch_pr` may proceed because they act on the current conversation. A scheduled message starts a normal turn in the same conversation. That turn passes the gate again. `session_schedule`, `session_watch_pr`, and `repo_watch` stay blocked because they act on another session or on PiP. `write`, `edit`, and `bash` stay blocked because they change files or run a shell command. `background` stays blocked with action `start` because it runs a shell command. This is the only exception that depends on an argument.

**Default:** Orchestrator mode is on while a conversation stores no state. The default comes from the read path, not from a written row, so a conversation that nobody touched is in the mode without a write. The first press of the chip turns the mode off and writes that state.

**Subagents:** A subagent conversation never enters the mode, and it keeps the tools that its parent granted. Two signals decide this: the conversation ids of `run.started`, and the agent instructions prefix `You are the subagent "`.
