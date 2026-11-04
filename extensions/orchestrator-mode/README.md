# orchestrator-mode

This extension adds a durable per-conversation mode, a composer chip, the `/orchestrator-mode` command, and a conditional prompt for read-only orchestration.

**Rule:** While mode is on, only allowlisted inspection and delegation tools, plus custom tools marked read-only, can run. The orchestrator cannot change files or run `bash`; it must delegate changes to a subagent. The gate does not change the advertised tool list and is not a security boundary.
