# Design

## Context

See `proposal.md` - Why. The facts below shape the approach. All of them were verified in the container.

- Debian 12, Node 24.22.2, uid 0. `/app` and `/data` are writable. A module can import `node:child_process`.
- Absent: `node-pty`, `python3`, `tmux`, `socat`, `expect`, `gcc`. Present: `/usr/bin/script` (util-linux 2.38.1),
  `/usr/bin/perl` 5.36.0, `stty` (coreutils 9.1), `bash` 5.2.15.
- A route handler returns a JSON value only. There is no streaming response and no response object.
- `web.send` drops events past 100 each second and caps 1 event at 256 KB. It replays nothing after a reconnect.
- The Content Security Policy blocks a CDN: `script-src 'self'`. The renderer is a local copy.
- Lancet Guard judges only `bash`, `background`, `write`, `edit`. It does not judge an extension's routes, and it is off
  by default.

## Goals / Non-Goals

**Goals:**

- A real pseudo-terminal in a browser panel, with a shell that a person controls.

- A coalescing and snapshot protocol that survives the two limits of `web.send`.

- An explicit end state for every way that a shell can stop.

**Non-Goals:**

- No reattach to a shell after a module reload or a restart. Durability is Level 0.

- No model tool, no command chosen by the model, no terminal output in the prompt.

- No multiplexer, no session sharing between 2 conversations, and no server-side work in `/app`.

## Decisions

**1. The pseudo-terminal comes from `perl` plus `/usr/bin/script`.** `node-pty` is absent and there is no compiler.
`/usr/bin/script` gives the child a real pty (`/dev/pts/0`), but a fresh pty has size `0 0`, and `tput` then returns the
terminfo default 80x24. A small `perl` helper opens `/dev/ptmx` itself. It uses the ioctl constants TIOCSPTLCK
`0x40045431`, TIOCGPTN `0x80045430`, and TIOCSWINSZ `0x5414`, and it gives the size to the slave before it starts the
shell. The helper reads resize frames from a control file descriptor, fd 3. A resize therefore never writes an `stty`
line into the visible screen. Alternative rejected: `script` alone, because a resize then needs a command in the stream.

**2. The child gets `TERM=xterm-256color`.** `TERM` in the container is `dumb`, and escape and colour bytes would not
come through. Terminfo is at `/lib/terminfo/x/xterm-256color`; `/usr/share/terminfo` does not exist. The helper sets
`TERM` and points at the real terminfo path.

**3. The renderer is vendored in the module folder.** `@xterm/xterm` 6.0.0 (MIT) is a copy at
`extensions/pty-terminal/pty-terminal/lib/xterm.mjs` (344970 bytes, exports `Terminal` by name), with its stylesheet
`css/xterm.css` (7112 bytes), and `@xterm/addon-fit` 0.11.0 (1967 bytes). The browser folder loads them through
`pocket.style(path)` and a dynamic `import()`. A CDN URL is impossible under `script-src 'self'`. Each served file is
below the 8 MB limit.

**4. Output is coalesced into frames of 33 ms, kept in a 64 KB ring buffer, and replayed as a snapshot.** A route cannot
stream, and `web.send` drops events past 100 each second and caps 1 event at 256 KB. The module buffers the pty output
and sends 1 frame each 33 ms at most, cut below 256 KB. That is at most 30 frames each second, below the 100 drop
limit. Each frame carries a sequence number. The module keeps the last 64 KB in a ring buffer. When the panel mounts, it
asks for a snapshot, and the module answers with the buffer and its last sequence number. The panel discards a frame
that it already holds. Alternative rejected: a WebSocket, which the extension API does not give.

**5. The window size is set twice: at start, and on each fit.** The app gives no resize event. The panel uses a
`ResizeObserver` and the fit add-on. It posts the new column and row count to the module, and the module writes a resize
frame to fd 3.

**6. Durability is Level 0, and the end state is always explicit.** The shell is a child of the module. A module reload
or a restart kills it. A browser reload does not, because the panel mounts again on the same child and gets a snapshot.
The module writes the scrollback to a file under `/data/pty/`, so the last screen stays readable after a restart. The
module kills the child in `web.onDispose`. The panel shows "session ended" with the exit status, and never stops
silently.

**7. Access is `steer`, and input is driver-only.** Any person who may steer can use the terminal; `SECURITY.md` states
"Anyone who can steer can do what you can". A viewer gets 403 on each route. While take-turns is on, only the driver may
type, with the semantics of `requireDriver`. The refused person sees the reason in the panel.

## Risks / Trade-offs

- **The guard gap.** Lancet Guard judges only `bash`, `background`, `write`, `edit`. It does not judge an extension's
  tools or routes, and it is off by default. So this terminal is a shell with no guard in front of it. This is by
  design: the person types the command, not the model. → Mitigation: the extension policy S8.1 says "Do not make a tool
  that runs a command or writes a file that the model chose", and this change adds no such tool. Access stays at
  `steer`, a viewer gets 403, and only the driver types. The panel names the risk to the person, and the change does not
  raise access above `steer`.
- **Output can be lost.** `web.send` replays nothing, and a frame is dropped past 100 each second. → Mitigation: the
  33 ms coalescing, the 64 KB ring buffer, the sequence number, and the snapshot on mount. The scrollback file holds the
  full text.
- **A restart kills the shell.** Level 0 means no reattach. → Mitigation: the explicit "session ended" state and the
  scrollback file. A later change can add a multiplexer if the container gets one.
- **The vendored renderer is an extra dependency with a licence.** → Mitigation: 2 fixed versions (6.0.0, 0.11.0), MIT,
  with the licence file beside the copies, and no network fetch at run time.
- **The child runs as uid 0.** → Accepted: the container already gives `/app` and `/data` to the agent, so the terminal
  gives a person nothing that the agent does not have.

## Migration Plan

The module is new, so there is no data to migrate. It reaches Pi Pocket as a copy of
`extensions/pty-terminal/pty-terminal.ts` and its folder into the drop-in folder, by the skill
`.agents/skills/extension-dropin/SKILL.md`. To roll back, stop the extension in Menu → Extensions and remove the copy
from the drop-in folder. The files under `/data/pty/` can stay; they are only text.

## Open Questions

None. Each decision above follows from the fixed decisions of the owner and from a verified fact.
