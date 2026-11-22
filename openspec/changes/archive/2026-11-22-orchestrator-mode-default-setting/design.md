# Design

## Context

See `proposal.md` for motivation. The module currently uses `isOnByState` to treat missing state as on, and `toggleMode` flips the document value. The experimental settings API has been available since Pi Pocket 0.22.0 and provides `web.settings` plus `web.setting`. The owner tested the first version of this change and asked for one change to it: a change of the setting must not change a conversation that already started.

## Goals / Non-Goals

**Goals:**

- Declare the owner boolean setting `default_on` with default `true` when the settings API is available.
- Capture the current `default_on` value in a conversation at its first mode resolution and keep that value until a toggle.
- Apply a change of the setting only to conversations that never resolved the mode.
- Make a toggle invert the captured value, then store the result with actor and time.
- Keep explicit stored state authoritative, including after reloads and for forks with stored state.
- Preserve current on-by-default behavior on hosts without the settings API.

**Non-Goals:**

- No change to the composer chip, browser module, routes, command name, stored state shape, or prompt and tool behavior.
- No migration of existing stored conversation state.

## Decisions

1. **Register one boolean owner setting.** During extension setup, register `default_on` with a user-facing label and default `true`. Read it through the server-side settings accessor when calculating an effective state. Guard the registration and read path so an older host without the settings API uses `true`.
   - **Alternative rejected:** Change the document initial value only. That cannot be changed by the owner and would not provide the required Menu → Extensions control.

2. **Capture the setting at the first mode resolution.** A conversation that stores no mode state takes the current `default_on` value at its first mode resolution that can write, which is its first chip read or its first toggle. The read-only paths, the prompt and the tool gate, resolve the current setting only while the conversation stores no record. The module writes that value as a stored record, so a later change of the setting does not change the conversation. The captured record keeps the shape `{ on, by, at }`: `on` holds the captured value, `by` stays empty because no person made a choice, and `at` holds the time of the capture. Every write fills `at`, so every record differs from the document's initial value, and a later read and a later toggle tell a record from no record. Every later read takes the stored value. The captured value survives restarts. A fork with no stored state has no document, so it captures at its own first use.
   - **Accepted cost:** A first read writes a record. The capture is written at the first mode resolution by the first read path that can write it: the conversation GET route or a toggle path. The section and the mode gate read the stored document, and they use the current setting only while the conversation stores no record.
   - **Constraint:** The module must tell a captured record from a conversation that stores no record. The capture writes the time of the capture into `at`, so every record differs from the document's initial value, and the module reads that field as the record marker. The shape of a stored record does not change.
   - **Alternative rejected:** Read the setting live on every request, as the first version of this change did. That let a change of the setting change conversations that had already started. The owner asked for the capture instead.
   - **Alternative rejected:** Keep the setting out of the stored state and resolve it in memory on every request. That is the same live read that the owner rejected.

3. **Toggle the captured state.** The transaction determines the current state: a stored record gives its `on` value, and a conversation that stores no record gives the current `default_on` value, which the toggle captures. The transaction writes the inverse and keeps the existing actor and timestamp recording. The stored value is authoritative after that.
   - **Alternative rejected:** Negate the document's initial value. That always writes off on the first press when the setting is false.

4. **Leave browser behavior unchanged.** The composer chip will continue to read the existing GET route. Because that route uses the effective-state path, it captures the setting at its first read without a browser code change.

## Risks / Trade-offs

- [Risk] The settings API is experimental and may be absent on older hosts. → Guard both declaration and access, and use `true` as the compatibility fallback.
- [Risk] A first read now writes a record, so a read path becomes a write path. → Accept the cost of one write per conversation, and keep the capture out of the paths that cannot write.
- [Risk] A captured record can hold the same values as the document's initial value. → Mark the capture, so a later read and a later toggle tell it from a conversation that stores no record.
- [Risk] A change of the setting still changes conversations that never resolved the mode. → That is the wanted behavior: only conversations that never resolved the mode follow the setting.
- [Risk] Fork behavior can accidentally inherit a document initial value instead of using the setting. → A fork with no stored state has no document, so it captures the setting at its own first use.

## Migration Plan

Deploy the updated extension with `default_on` set to `true`. Existing stored states remain unchanged. A conversation that stores a state keeps it. A conversation that stores no state captures the current `default_on` value at its first mode resolution and keeps it, so a later change of the setting does not change it. To roll back, restore the previous module; stored states remain compatible.
