# Proposal

## Why

Today a person who wants a command in the container must ask the agent to run it. That puts the agent between the person
and the shell, and the agent gains a tool that runs model-chosen commands. A person needs a direct terminal in a browser
panel instead.

## What Changes

- 1 new extension module `pty-terminal` adds a panel with a real terminal. A person types into it, and a shell runs in the
  container.
- `access: "steer"` governs the terminal. Any person who may steer can use it. A viewer gets 403.
- Input is driver-only. While take-turns is on, only the driver may type. The module reuses the semantics of
  `requireDriver`.
- The terminal is not a model tool. Its output never enters Pi's prompt and never becomes a tool result.
- Durability is Level 0. The shell is a child of the module. A module reload or a server restart kills it. A browser
  reload does not.
- The module writes scrollback to a file under `/data/pty/`. The module kills its child in `web.onDispose`.
- The panel shows an explicit "session ended" state. It must never fail silently.
- The change adds no tool that runs a command or writes a file that the model chose.

## Capabilities

### New Capabilities

- `pty-terminal`: the behavior of the terminal panel: access control, driver-only input, output delivery and coalescing,
  snapshot after reconnect, window size, session end and cleanup, and isolation from the model's context.

### Modified Capabilities

None.

## Impact

- Added: `extensions/pty-terminal/pty-terminal.ts`, the module.
- Added: `extensions/pty-terminal/pty-terminal/`, the browser folder: `index.js`, a vendored `@xterm/xterm` 6.0.0
  renderer, its CSS, and `@xterm/addon-fit` 0.11.0.
- Added: the perl pty helper that the module starts, and the scrollback files under `/data/pty/`.
- No change to Pi Pocket itself. The module uses the extension API only: `pocket.panel`, `web.send`, `pocket.on`,
  `pocket.style`, and a route handler.
- The app Content Security Policy blocks a CDN, so the renderer and its CSS are copies in the module folder, not URLs.
- Lancet Guard does not judge an extension's routes. The risk and its mitigation are in `design.md`.
