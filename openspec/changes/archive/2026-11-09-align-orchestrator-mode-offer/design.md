# Design

## Context

See proposal.md - Why for the motivation. Three facts shape the approach.

1. Two prompt sections offer tools to the orchestrator, and both come from Pi Pocket, not from this module: the deferred tools offer of the tool search module, and the codemode section, which in its only-scripts setting shows each tool that a script may call, with description and parameters.
2. The extension API gives a module a section wrapper by key. The wrapper receives the section and returns a section, and the render of that section can return undefined to suppress the text. The render input holds the conversation id, the agent with its tools, callable, and deferred lists, and a document reader.
3. The gate is the only authority for a call. A call from a codemode script runs the same beforeTool hooks, so a blocked tool stays blocked whatever the prompt offers.

## Goals / Non-Goals

**Goals:**

- One rule, read by the gate and by both offers.
- No false offer while the mode is on, and no change while it is off.
- A block message that states the rule and the way forward.

**Non-Goals:**

- No change to the allowlist or to the set of blocked tools.
- No wrapper on the tool search tool.
- No dependence on the only-scripts service of the codemode module.
- No change to Pi Pocket, and no new storage, route, command, or setting.

## Decisions

### D1 Filter the rendered text instead of rebuilding the offer

The alternative is to render our own list from the agent lists. Rejected: the host decides which tools wait, and that decision has a branch for the only-scripts setting. A rebuilt list could offer a tool that cannot be loaded, which is the same defect inverted. A filter removes text, so it cannot add an offer.

### D2 One predicate for the gate and for both offers

The predicate keeps the order of the gate: the explicitly blocked set, then background (allowed, because only its start action is blocked), then the allowlist, then built-in names, which fail closed. A tool that is not built in stays out of the predicate, because the gate reads its read-only annotation, and an offer cannot do that with a name.

### D3 Read the mode state the way the prompt section already reads it

The wrapper reads the state document with the document reader of the render input, the same read the prompt section performs. No new store, no cache, no route.

### D4 Two wrappers from one helper

One helper takes the section key and a strip function, and returns the wrapper. The strip functions recognize exactly 3 shapes, and nothing else:

    a bullet line: hyphen, space, tool name, colon, then text
    a block: two hashes, space, tool name, then lines up to the next such block
    the trailing names sentence of the codemode offer, comma separated

When a shape does not match, the text passes through unchanged, and the result is the behavior from before this change.

### D5 An empty result suppresses the section

When no text remains, render returns undefined, so the section does not appear.

### D6 One message for every blocked tool

The rule is the same for each blocked tool, so one sentence serves all of them. It keeps the tool name, so the orchestrator can report it, and it names the tools grant of a subagent as the way forward. The gate keeps its decisions; only the text changes.

### D7 The prompt states the rule

One sentence in the prompt section of the mode. It covers a guessed tool name after the offers stopped showing it.

### D8 Alternative rejected: set the callers field on blocked tools

Wrapping each blocked tool with a callers value that excludes the model makes both offers skip it, because both filter on that field. Rejected: callers decides who may call a tool and it drives the callable list. A false value could remove a tool from the callable list or declare it to the model directly.

### D9 Alternative rejected: read the only-scripts service

The codemode module provides that service and the tool search module reads it. Rejected: the service is not a documented contract, and the filters work in both settings without it.

## Risks / Trade-offs

- Pi Pocket changes the text of a section -> the filter removes only recognized shapes, so an unknown shape returns today's behavior. Each offer has a scenario that a person checks by hand.
- The filter hides a tool that the gate allows -> one predicate serves both readers, and the scenarios name the tools that must stay.
- No automated test for prompt text -> the type check plus one manual pass in a conversation with the mode on, in both settings of codemode.
- The module knows 3 text shapes of Pi Pocket -> the alternative, a host hook that lets a mode declare blocked tools, is a Pi Pocket change and out of scope here.

## Migration Plan

No data or API migration. A new copy of the module in the drop-in folder applies the change, and removing the copy restores the previous behavior.

## Open Questions

None.
