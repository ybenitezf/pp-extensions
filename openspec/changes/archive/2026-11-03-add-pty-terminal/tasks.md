# Tasks

## 1. The vendored renderer

- [x] 1.1 put `@xterm/xterm` 6.0.0 into `extensions/pty-terminal/pty-terminal/lib/xterm.mjs` and its stylesheet into
  `css/xterm.css`, and put `@xterm/addon-fit` 0.11.0 beside them; verify that `lib/xterm.mjs` is 344970 bytes, that
  `css/xterm.css` is 7112 bytes, and that each file is below the 8 MB serving limit
- [x] 1.2 put the MIT licence of each package into the module folder; verify that each copied file has its licence text
- [x] 1.3 write `index.js` in `extensions/pty-terminal/pty-terminal/`, with the `import` of the renderer, the
  `pocket.style` call, and the fit add-on; verify that the panel renders a prompt and that the browser console shows no
  Content Security Policy error

## 2. The perl pty helper

- [x] 2.1 write the helper that opens `/dev/ptmx` with TIOCSPTLCK `0x40045431` and TIOCGPTN `0x80045430`, unlocks the
  slave, sets the size with TIOCSWINSZ `0x5414`, and starts the shell with `TERM=xterm-256color`; verify that the child
  reports `/dev/pts/N` from `tty` and that `tput cols` returns the size that was set, not 80
- [x] 2.2 make the helper read resize frames from fd 3 and apply them with TIOCSWINSZ; verify that a resize changes
  `tput cols` and that no `stty` line appears in the output stream
- [x] 2.3 verify that escape and colour bytes pass through unchanged with a command that writes SGR colour, and that
  `echo -e "\e[31mred\e[0m"` shows 1 red word in the panel

## 3. The module on the server

- [x] 3.1 write `extensions/pty-terminal/pty-terminal.ts` with `access: "steer"` and 1 route set; verify that a call
  from a person with the role `viewer` gets the status 403 and that no child process starts
- [x] 3.2 keep 1 child each conversation, and refuse input from a person who is not the driver while take-turns is on,
  with the semantics of `requireDriver`; verify that a non-driver keystroke sends no byte and that the panel shows the
  refusal
- [x] 3.3 coalesce the output into frames each 33 ms, cut each frame below 256 KB, and send it with `web.send`; verify
  with a 5 MB output that no frame passes 256 KB and that no event is dropped
- [x] 3.4 keep the last 64 KB of output in a ring buffer with a sequence number, and answer the snapshot request with
  the buffer and its last number; verify that a browser reload shows the last screen and adds no duplicate text
- [x] 3.5 write the scrollback to a file under `/data/pty/`, kill the child in `web.onDispose`, and send the end state
  with the exit status; verify that `exit 0` shows "session ended" with status 0 and that the file holds the text
- [x] 3.6 run `scripts/check.sh` and verify that it prints exit code 0

## 4. The panel

- [x] 4.1 add the panel with `pocket.panel({ id, title, component, icon, wide })`, and draw the renderer inside it;
  verify that the panel opens on a phone and fits the width
- [x] 4.2 use a `ResizeObserver` and the fit add-on, and post the new column and row count to the module; verify that a
  turn of the phone changes `tput cols` in the running shell
- [x] 4.3 drive the terminal from `pocket.on(event, run)`: the snapshot, the frame, the refusal, and the end state;
  verify that each of the 4 events changes the panel
- [x] 4.4 show "session ended" with the exit status, disable the input, and keep the last screen readable; verify that a
  server restart shows the state and not a frozen panel

## 5. Documentation and install

- [x] 5.1 add a short section to `index.entries.json` for the module; verify that the entry names `pty-terminal` and
  that no name starts with `pocket-`
- [x] 5.2 install the module by the skill `.agents/skills/extension-dropin/SKILL.md` as a copy; verify that Pi Pocket
  loads it and that the panel appears in the panel list
- [x] 5.3 verify that the terminal output never enters the prompt: run a command in the panel, send a message, and
  confirm that the agent's context holds only the message

## Workflow follow-up

- Commit as `feat: add pty-terminal` after `scripts/check.sh` prints exit code 0.
- Archive this change after the project's review requirements are satisfied.
