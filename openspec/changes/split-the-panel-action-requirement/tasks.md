# Tasks

## 1. The delta

- [x] 1.1 shorten the requirement "The panel offers the change's next action as a message" to its rule, and keep its 2
  scenarios
- [x] 1.2 add the requirement "The panel offers no other action for a change", with its scenario and the reason in 1
  sentence

## 2. The checks

- [ ] 2.1 run `openspec validate --all` and confirm that the warning about a long requirement is gone
- [x] 2.2 confirm that the 2 requirements name the same behavior that `extensions/openspec-status/openspec-status/index.js`
  has: `pocket.insertText` for apply and archive, and no other button for a change
- [ ] 2.3 archive this change, so that `openspec/specs/openspec-status/spec.md` takes the 2 requirements
