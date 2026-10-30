# git-identity

Keeps the global git identity of this machine equal to 2 Pi Pocket settings.

The settings are the truth. Git holds the same 2 values, written from them, and git is never read back into the form.

## The 2 settings

Pi Pocket's own settings form shows them:

| setting | label | placeholder |
| --- | --- | --- |
| `user_name` | User name | `Ada Lovelace` |
| `user_email` | Email | `ada@example.com` |

Both start empty. A blank setting is skipped: it writes nothing and never removes a key.

## The file it writes

The module runs `git config --global` for the keys `user.name` and `user.email`. That is all it writes.

The file is the global git config, `~/.gitconfig`, which git finds through the `HOME` of the Pi Pocket server. In a
container, that is the container's file, not a file on your laptop.

- Only `user.name` and `user.email` change. Every other git setting stays as it is.
- The module never edits the file text itself. Git writes the file, so git owns the format, the quoting, and the lock.

## The 3 moments it writes

The module compares the settings with git at 3 moments:

1. when the module loads,
2. when the settings are saved,
3. when a new session is created.

So a hand edit to `~/.gitconfig` is undone at the next session: git returns to what the settings say.

## Values it refuses

A value is checked before it goes to git. A value is refused, with 1 warning, when it holds a control character, when a
name is longer than 100 characters, when an email is longer than 254 characters, or when an email does not look like
`x@y.z`. A refused value changes nothing in git.

## Requirements

It needs Pi Pocket 0.22.0. On an older server the module sends 1 notice and installs nothing.

It adds no other surface to Pi Pocket: no tool, no command, and no route.
