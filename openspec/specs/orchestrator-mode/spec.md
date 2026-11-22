# orchestrator-mode Specification

## Purpose

Provides a conversation mode for read-only orchestration. It lets a person delegate implementation work while the orchestrator itself does not change files.

## Requirements

### Requirement: Conversation-scoped mode state
The system MUST let a person turn orchestrator mode on and off for the current conversation. A change MUST record whether it is on, who changed it, and when. A stored state MUST survive reloads. When no state is stored, a toggle MUST capture the current `default_on` value and invert it.

#### Scenario: Turn mode on
- **WHEN** a person turns orchestrator mode on
- **THEN** the current conversation records the on state, actor, and time

#### Scenario: Turn mode off
- **WHEN** a person turns orchestrator mode off
- **THEN** the current conversation records the off state, actor, and time

#### Scenario: Reload an enabled conversation
- **WHEN** an enabled conversation reloads
- **THEN** orchestrator mode remains on

#### Scenario: First press in a session with no stored state
- **WHEN** a person toggles orchestrator mode in a conversation that stores no state
- **THEN** the conversation records the inverse of the captured `default_on` value, actor, and time in 1 commit, and the mode matches that inverse

#### Scenario: A toggle inverts the captured value
- **WHEN** a person toggles orchestrator mode in a conversation that captured a value, and the owner changed `default_on` after that capture
- **THEN** the conversation records the inverse of the captured value, actor, and time

### Requirement: Mode is on by default
A conversation with no mode state MUST capture the current `default_on` value at its first mode resolution that can write, which is its first chip read or first toggle. The read-only paths, the prompt and tool gate, MUST resolve the current setting only while the conversation stores no record. It MUST keep that captured value until a toggle replaces it, and it MUST survive reloads and restarts. The default MUST be true. A conversation that never resolved the mode follows the current setting.

#### Scenario: A conversation that nobody touched
- **WHEN** a person opens a session that stores no mode state
- **THEN** the chip read captures the current `default_on` value and the session keeps it

#### Scenario: The composer chip of a session that stores no state
- **WHEN** a person opens a session that stores no state
- **THEN** the chip read captures the current `default_on` value, and 1 press toggles that captured value

#### Scenario: A session that exists before the change
- **WHEN** the module loads with a configured default and a session from an earlier version stores no state
- **THEN** that session captures the configured default at its next mode resolution

#### Scenario: A stored off survives a restart
- **WHEN** the server restarts after a person turned the mode off in a session
- **THEN** that session is not in orchestrator mode

#### Scenario: A captured value survives a change of the setting and a restart
- **WHEN** the owner changes `default_on` and the server restarts after a session captured a value
- **THEN** that session keeps its captured value

#### Scenario: A fork of a session that stores off
- **WHEN** a person forks a session and the fork stores no mode state
- **THEN** the fork captures the current `default_on` value at its own first use, whether or not the source session stores off

### Requirement: Owner-controlled default mode setting
The module MUST declare one owner setting named `default_on` as a boolean with a label and default value `true`. Only the owner can change it in Menu → Extensions. When the settings API is absent, the module MUST preserve the current on-by-default behavior.

#### Scenario: The setting is available to the owner
- **WHEN** the module runs on a host with the settings API
- **THEN** Menu → Extensions shows one boolean `default_on` setting for the module with default value `true`

#### Scenario: The owner changes the default
- **WHEN** the owner changes `default_on`
- **THEN** a conversation that never resolved the mode uses the new setting value, while a conversation that captured a value keeps that captured value

#### Scenario: The settings API is absent
- **WHEN** the module runs on a host without the settings API
- **THEN** it does not require the setting and a conversation with no stored state remains in orchestrator mode

### Requirement: Subagent conversations never enter the mode
A subagent conversation MUST stay out of orchestrator mode. Its prompt MUST NOT hold the orchestrator section, the gate MUST NOT filter its tool calls, and the deferred and codemode offers MUST read as the source sections render them. A subagent MUST keep the tools that its parent granted.

#### Scenario: A subagent changes a file
- **WHEN** a subagent with `write` in its tools grant changes a file while its session is in orchestrator mode
- **THEN** the call proceeds

#### Scenario: A subagent runs a shell command
- **WHEN** a subagent with `bash` in its tools grant runs a shell command
- **THEN** the call proceeds

#### Scenario: The subagent prompt
- **WHEN** a subagent renders its prompt
- **THEN** the prompt holds no orchestrator-mode section, and the 2 offers are unchanged

#### Scenario: A restart during a subagent run
- **WHEN** the server restarts during a subagent run and the subagent calls a tool
- **THEN** the gate does not filter the call

### Requirement: Orchestrator mode prompt
The system MUST include the orchestrator-mode prompt section only while the mode is on. The section MUST direct the orchestrator to read and delegate, and never change files itself. It MUST direct the orchestrator to set an explicit, task-specific `tools` grant on every subagent spawn, including read-only tasks. Each brief MUST state whether the child may change files and which paths it may touch. The section MUST preserve the host failure rule: retry a task-level failure at most once on the same model, but stop and report a model or provider failure.

#### Scenario: Prompt section is enabled
- **WHEN** the conversation has orchestrator mode on
- **THEN** its prompt includes the orchestrator-mode section

#### Scenario: Prompt section is disabled
- **WHEN** the conversation has orchestrator mode off
- **THEN** its prompt does not include the orchestrator-mode section

#### Scenario: Subagent calls omit the tools argument
- **WHEN** the orchestrator calls the subagent tool with `send`, `stop`, or `status`
- **THEN** it omits the `tools` argument because the argument applies only to `spawn`

#### Scenario: Every spawn has an explicit task grant
- **WHEN** the orchestrator spawns a child for any task, including a read-only task
- **THEN** it supplies an explicit grant containing only the tools needed for that task

#### Scenario: Brief keeps file-change limits
- **WHEN** the orchestrator prepares a brief for a child
- **THEN** the brief states whether the child may change files and which paths it may touch

#### Scenario: Task-level failure gets at most one corrected retry
- **WHEN** a child has a task-level failure that is not caused by its model or provider
- **THEN** the orchestrator may correct the brief and retry once on the same model

#### Scenario: Model or provider failure is reported
- **WHEN** a child fails because of its model or provider
- **THEN** the orchestrator stops and reports the failure without retrying the work on another model

### Requirement: Simplified Technical English for delegated communication
While orchestrator mode is on, the `orchestrator_mode` prompt section MUST tell the orchestrator to write each brief to a subagent in ASD-STE100 and ask for the report in the same style. The section MUST NOT restate Pi Pocket's own Simplified Technical English rules or replace the core `subagents` or `guidelines` sections. Simplified Technical English applies only to text between agents. The orchestrator MUST answer the person in normal English and reduce the reports into that answer.

#### Scenario: Brief and report use Simplified Technical English
- **WHEN** the orchestrator delegates work while mode is on
- **THEN** it writes the brief in Simplified Technical English and asks for the report in Simplified Technical English

#### Scenario: Person receives a normal English summary
- **WHEN** the orchestrator reads a Simplified Technical English report and answers the person
- **THEN** it gives a normal English answer that reduces the report

### Requirement: Allowlisted tools while mode is on
While orchestrator mode is on, the system MUST allow only `read`, `subagent`, `ask`, `tool_search`, `codemode`, `artifact`, `sessions`, `session_read`, `design_preview`, `secrets_list`, `schedule`, `watch_pr`, `background` when its action is not `start`, and `memory`, plus non-built-in tools with `annotations.readOnlyHint === true`. It MUST block other tools. The gate follows the TARGET of a tool call: tools that act only on the current conversation may proceed, and tools that act on another session or on PiP stay blocked. This gate applies at tool-call time and does not change the model's advertised tool list. The separate `memory` extension still holds each memory write for the owner's approval.

#### Scenario: An allowlisted tool is called
- **WHEN** the orchestrator calls an allowlisted tool
- **THEN** the call proceeds

#### Scenario: A read-only non-built-in tool is called
- **WHEN** the orchestrator calls a non-built-in tool with `annotations.readOnlyHint === true`
- **THEN** the call proceeds

#### Scenario: The memory tool is called
- **WHEN** the orchestrator calls `memory` while the mode is on
- **THEN** the call proceeds and the separate `memory` extension applies its own approval flow to the write

#### Scenario: An inline artifact card is requested
- **WHEN** the orchestrator calls `artifact` with `inline: true`
- **THEN** the call proceeds

#### Scenario: File changes and shell commands are attempted
- **WHEN** the orchestrator calls `write`, `edit`, or `bash`
- **THEN** the call is blocked

#### Scenario: A command-starting background action is attempted
- **WHEN** the orchestrator calls `background` with action `start`
- **THEN** the call is blocked

#### Scenario: Other sessions are changed
- **WHEN** the orchestrator calls `session_start`, `session_send`, `session_follow`, `session_stop`, `session_archive`, `session_schedule`, or `team`
- **THEN** the call is blocked

#### Scenario: Scheduling or watcher tools are called
- **WHEN** the orchestrator calls `schedule` or `watch_pr` in the current conversation while the mode is on
- **THEN** the call proceeds

#### Scenario: A scheduling or watcher tool targets another session or PiP
- **WHEN** the orchestrator calls `session_schedule`, `session_watch_pr`, or `repo_watch`
- **THEN** the call is blocked

#### Scenario: State-changing tools are called
- **WHEN** the orchestrator calls `approvals`, `ask_someone`, `secret_request`, `secret_save`, `design_export`, or `design_system`
- **THEN** the call is blocked

#### Scenario: The reserved legacy tool name is called
- **WHEN** the orchestrator calls `artifact_inline`
- **THEN** the call is blocked by the gate

### Requirement: Unchanged subagent arguments
While orchestrator mode is on, the system MUST NOT change the `model`, `tools`, `thinking`, or `followUp` arguments of a `subagent` call. The orchestrator chooses these arguments, and the built-in tool validates `model` against the owner's allowlist.

#### Scenario: The orchestrator supplies a model
- **WHEN** the orchestrator calls `subagent` with a `model` while mode is on
- **THEN** the module passes the call through unchanged

#### Scenario: The orchestrator supplies no model
- **WHEN** the orchestrator calls `subagent` without a `model` while mode is on
- **THEN** the module leaves `model` absent

### Requirement: Delegated child tool grant
While orchestrator mode is on, the orchestrator MUST be able to grant a child tools beyond the mode's allowlist. Each spawn MUST include only tools needed for that task, and the grant MUST be limited to tools available to the parent. If later work needs a different grant, the orchestrator MUST spawn a new child because `send` cannot change an existing child's grant.

#### Scenario: A child receives a wider tool grant
- **WHEN** the orchestrator supplies a task-specific grant wider than the mode's allowlist
- **THEN** the built-in tool gives the child the supplied tools, if they are available to the parent

#### Scenario: A read-only task receives an explicit grant
- **WHEN** the orchestrator spawns a child for a read-only task that needs only `read`
- **THEN** it explicitly grants `read` and does not omit the `tools` argument

#### Scenario: A later task needs a different grant
- **WHEN** a later task for an existing child needs a different tool grant
- **THEN** the orchestrator spawns a new child with the needed grant instead of using `send` to change the grant

### Requirement: Cost-aware subagent model selection
While orchestrator mode is on, the orchestrator-mode prompt section MUST direct the orchestrator to prefer the lowest-cost owner-allowed model capable of a delegated task. It MUST select a higher-cost model only for a task-specific capability reason. It MUST treat unknown price as unknown, not cheap, and choose such a model only when its capabilities justify the uncertainty. It MUST NOT select outside the owner's allowlist or invent a cheaper alternative when none is available.

#### Scenario: Cheaper allowed model fits a simple task
- **WHEN** the orchestrator delegates a simple task and one owner-allowed model has lower known input and output prices than another allowed model for that task
- **THEN** it chooses the lower-priced model

#### Scenario: Higher-cost model chosen for a task-specific capability
- **WHEN** a delegated task needs a capability that only a higher-cost owner-allowed model provides
- **THEN** it chooses that higher-cost model and the reason is the task-specific capability need

#### Scenario: Unknown price is not treated as cheap
- **WHEN** an owner-allowed model has no known price and another allowed model has lower known prices for the expected task
- **THEN** the orchestrator does not choose the unknown-price model solely because it might be cheap

#### Scenario: No selection outside the allowlist
- **WHEN** the cheapest capable model is not in the owner's allowlist
- **THEN** the orchestrator chooses from the allowed models and does not invent an unallowed alternative

### Requirement: Report planned subagent models
The orchestrator-mode prompt section MUST direct the orchestrator to make the visible DAG/wave plan list the effective `provider/modelId` for every subagent spawn before dispatch. When `model` is omitted for a spawn, the plan MUST identify the effective current-session model for it. For any choice of a higher-cost or unknown-price model, the plan MUST include a brief task-specific capability reason.

#### Scenario: Explicit model named before dispatch
- **WHEN** the orchestrator sets `model` on a spawn and writes the DAG/wave plan before dispatch
- **THEN** the plan lists that spawn's effective `provider/modelId`

#### Scenario: Inherited session model identified
- **WHEN** a spawn omits `model`
- **THEN** the plan names the effective current-session model for that spawn

#### Scenario: Higher-cost choice carries its reason
- **WHEN** the plan lists a model that costs more than a cheaper capable allowed model, or has unknown price
- **THEN** the plan includes a brief task-specific capability reason for that choice

### Requirement: Person-controlled mode entries
The system MUST provide one composer chip and one `/orchestrator-mode` command to turn the mode on or off for a session that can hold it. The chip MUST be present only while the open room is such a session.

#### Scenario: Person toggles from the composer
- **WHEN** the person activates the orchestrator-mode composer chip in a session
- **THEN** the mode toggles for that session

#### Scenario: Mode state is visible and can be turned off
- **WHEN** orchestrator mode is on or off in a session
- **THEN** the composer chip keeps one icon in both states, shows whether the mode is on without hover using the built-in Plan chip's border and tint for the on-state, and lets the person turn the mode off from the chip

#### Scenario: Chip is absent in a subagent transcript
- **WHEN** a subagent transcript is open
- **THEN** no orchestrator-mode composer chip is shown

#### Scenario: Chip returns with the main session state
- **WHEN** the person returns from a subagent transcript to the main session
- **THEN** the composer chip is shown with the main session's orchestrator-mode state

#### Scenario: Command refuses a non-session room
- **WHEN** the person runs `/orchestrator-mode` while the open room is not a session
- **THEN** the mode state does not change and the person is told that orchestrator mode applies to the main session

#### Scenario: Person toggles with the command
- **WHEN** the person runs `/orchestrator-mode` in a session
- **THEN** the mode toggles for that session


### Requirement: Blocked tools are absent from the deferred offer

While orchestrator mode is on, the deferred tools offer MUST NOT list a tool that the gate blocks. It MUST keep a tool whose call the gate allows, and it MUST keep background, because only the start action of background is blocked.

#### Scenario: Blocked deferred tools are absent

- **WHEN** orchestrator mode is on and the deferred tools offer would list browser, design_export, design_system, or ask_someone
- **THEN** the offer does not list that tool

#### Scenario: Allowed deferred tools remain

- **WHEN** orchestrator mode is on
- **THEN** the deferred tools offer keeps background, design_preview, schedule, watch_pr, and subagent

#### Scenario: No deferred tool remains

- **WHEN** orchestrator mode is on and the gate blocks every tool of the deferred offer
- **THEN** the offer lists no tool, and the section keeps only its header line

### Requirement: Blocked tools are absent from the script offer

While orchestrator mode is on, the codemode tools offer MUST NOT show a tool that the gate blocks. It MUST keep the tools that the gate allows, and it MUST keep the tools whose call the gate permits in that setting.

#### Scenario: State-changing built-in tools are absent

- **WHEN** orchestrator mode is on and the codemode offer would show bash, write, edit, secret_request, or secret_save
- **THEN** the offer does not show that tool

#### Scenario: Allowed script tools remain

- **WHEN** orchestrator mode is on
- **THEN** the codemode offer keeps the tools that the gate allows from a script

### Requirement: Both offers are unchanged while the mode is off

While orchestrator mode is off, the system MUST leave the text of the deferred tools offer and of the codemode offer as the source sections render it.

#### Scenario: The mode is off

- **WHEN** orchestrator mode is off
- **THEN** both offers read as they do without this behavior

### Requirement: The block message names the mode rule

While orchestrator mode is on, a blocked call MUST be answered with a message that names the tool, states that the mode offers read-only tools only, and states that a subagent can receive the tool in its tools grant. The message MUST NOT give the delegation instruction alone.

#### Scenario: A state-changing tool is blocked

- **WHEN** the orchestrator calls write, edit, bash, design_export, design_system, ask_someone, or a secret tool while the mode is on
- **THEN** the call is blocked with a message that names the tool, the mode rule, and the tools grant of a subagent

#### Scenario: A background start is blocked

- **WHEN** the orchestrator calls background with action start while the mode is on
- **THEN** the call is blocked with the same kind of message

#### Scenario: A blocked call from a script

- **WHEN** a codemode script calls a blocked tool while the mode is on
- **THEN** the script receives an error that holds the same message

#### Scenario: An allowed tool is not blocked

- **WHEN** the orchestrator calls an allowlisted tool while the mode is on
- **THEN** the call proceeds and no message is produced

#### Scenario: A read-only tool that is not built in

- **WHEN** the orchestrator calls a tool that is not built in and that declares the read-only annotation while the mode is on
- **THEN** the call proceeds

### Requirement: The prompt states the mode rule

While orchestrator mode is on, the orchestrator prompt section MUST state that the mode offers read-only tools only and that a step which needs another tool goes into the tools grant of a subagent. The section MUST NOT list the blocked tool names.

#### Scenario: The rule is in the prompt

- **WHEN** orchestrator mode is on
- **THEN** the prompt states the rule and the destination of a step that needs another tool

### Requirement: Built-in tool inventory matches the host
The module MUST keep its built-in tool inventory equal to the host's `BUILT_IN_TOOLS` set, exact in both directions. A difference MUST fail `scripts/check.sh`. A run that finds 0 names MUST fail, and a host file without the anchor MUST fail. The copy stays, because no public extension API exposes the built-in tool names.

#### Scenario: The sets match
- **WHEN** the module's `BUILT_IN_TOOL_NAMES` set holds the same names as the host's `BUILT_IN_TOOLS` set
- **THEN** the check step passes, and `scripts/check.sh` reports the 2 name counts

#### Scenario: The host source is absent
- **WHEN** the host source file is not on this machine
- **THEN** the check step prints that it skipped the comparison, and it does not fail the run

#### Scenario: The sets differ
- **WHEN** a name is in one set and not in the other
- **THEN** the check names each missing name in each direction, and `scripts/check.sh` exits non-zero

### Requirement: A logical wave is a completion barrier
While orchestrator mode is on, the orchestrator MUST wait for each work unit in the current logical wave to return a terminal outcome. It MUST reduce and verify those outcomes before dispatching a later wave.

#### Scenario: Every work unit returned
- **WHEN** every work unit in the current logical wave has returned a terminal outcome
- **THEN** the orchestrator reduces and verifies the wave outcomes before dispatching the next wave

#### Scenario: A work unit remains active
- **WHEN** any work unit in the current logical wave has not returned a terminal outcome
- **THEN** the orchestrator does not dispatch a later wave

### Requirement: Review the remaining DAG after every wave
After each logical wave is reduced and verified, the orchestrator MUST review every pending work unit and dependency against the wave's evidence. It MUST preserve completed work and the original request. It MUST change pending work only when evidence materially affects it. Otherwise, it MUST state that the remaining DAG is unchanged.

#### Scenario: Evidence does not affect pending work
- **WHEN** the audit finds no material effect on pending work or dependencies
- **THEN** the orchestrator states that the remaining DAG is unchanged and retains the current pending plan

#### Scenario: Evidence affects pending work
- **WHEN** evidence materially changes pending task needs or dependencies
- **THEN** the orchestrator updates only the remaining DAG and preserves completed work and its results

### Requirement: Show the revised plan before dispatch
When an audit changes the pending DAG, the orchestrator MUST recompute the remaining wave order from the revised nodes and dependencies. Before dispatching the next wave, it MUST show a concise diff of added, removed, or changed nodes and edges, the reason, and the next wave. The diff MUST NOT include a concurrent-call count.

#### Scenario: The audit changes the pending DAG
- **WHEN** the audit changes a pending node or dependency
- **THEN** the orchestrator recomputes future wave order and shows the diff, reason, and next wave before dispatch

#### Scenario: The audit leaves the DAG unchanged
- **WHEN** the audit finds no material change
- **THEN** the orchestrator states that the DAG is unchanged and shows the next wave without a concurrent-call count

### Requirement: Replanning preserves the requested scope
The orchestrator MUST use replanning only to fulfill the original request. If a candidate update would alter or expand the requested scope, it MUST pause and ask the person before dispatching that work.

#### Scenario: A re-plan preserves scope
- **WHEN** the audit changes task decomposition without changing the requested outcome
- **THEN** the orchestrator may update the pending DAG without changing scope

#### Scenario: A re-plan would change scope
- **WHEN** a candidate update would alter or expand the requested outcome
- **THEN** the orchestrator does not dispatch the changed work and asks the person for a decision

### Requirement: Independent verifier model selection
The orchestrator MUST run an independent verifier on a model different from the child model. When the owner's allowlist offers more than one model, it MUST prefer a model from a different provider.

#### Scenario: Verifier uses a different model
- **WHEN** a child claims a result that requires independent verification and the allowlist has another model
- **THEN** the orchestrator dispatches the verifier on a model different from the child's model

#### Scenario: Verifier prefers a different provider
- **WHEN** the allowlist has more than one model and at least one allowed model uses a provider different from the child's model
- **THEN** the orchestrator prefers an allowed verifier model from that different provider

### Requirement: Single-model verifier fallback
The orchestrator MUST still spawn an independent verifier when the owner's allowlist contains only one model, and MUST disclose the weaker check in the verifier dispatch line.

#### Scenario: Only one model is allowed
- **WHEN** a child claims a result that requires independent verification and only one model is allowed
- **THEN** the orchestrator runs the verifier on that model and includes a disclosure such as `verifier on <model> (only allowed model)`

### Requirement: Clean-room verifier brief
The independent verifier brief MUST provide the task and how to check it, and MUST NOT provide the child's claimed result.

#### Scenario: Verifier receives an unleading brief
- **WHEN** the orchestrator dispatches an independent verifier for a claimed test or command result
- **THEN** the brief tells the verifier what to run and how to check it without stating or implying the child's claimed outcome

### Requirement: Unrepeatable result verification trigger
The orchestrator MUST spawn one independent verifier only when a child claims a test or command result that the orchestrator cannot repeat itself.

#### Scenario: The orchestrator cannot repeat a claimed result
- **WHEN** a child claims a test or command result that the orchestrator cannot repeat
- **THEN** the orchestrator spawns one independent verifier

#### Scenario: The orchestrator can repeat the result
- **WHEN** a child claims a test or command result that the orchestrator can repeat itself
- **THEN** the orchestrator does not spawn an independent verifier for that claim

### Requirement: Verifiers are not verified
The orchestrator MUST NOT spawn a verifier to verify a verifier's claimed result.

#### Scenario: A verifier reports a result
- **WHEN** an independent verifier claims a test or command result
- **THEN** the orchestrator does not spawn another verifier for that result
