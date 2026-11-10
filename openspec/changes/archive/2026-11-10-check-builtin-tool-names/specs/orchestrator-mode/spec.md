# Spec Delta

## ADDED Requirements

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
