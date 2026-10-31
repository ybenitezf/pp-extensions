# Tasks

## 1. The skill

- [x] 1.1 add the drop-in folder definition and the `$dropin` shell form to the skill's facts
- [x] 1.2 add the `test -d "$dropin"` guard to the skill
- [x] 1.3 replace every `/data/extensions` path in the skill's commands with `"$dropin"`
- [x] 1.4 replace every `/data/extensions` path in the skill's prose, and in its front-matter description

## 2. The other live files

- [x] 2.1 replace the path in `AGENTS.md`
- [x] 2.2 replace the path in `README.md`
- [x] 2.3 replace the path in `docs/adding-an-extension.md`
- [x] 2.4 replace the path in `openspec/config.yaml`

## 3. The type-check script

- [x] 3.1 give `scripts/check.sh` the same default: `drop_in="${POCKET_DROPIN:-${PI_POCKET_DIR:-$HOME/.pi-pocket}/extensions}"`

## 4. The delta and the checks

- [x] 4.1 write the delta: 4 MODIFIED requirements and 1 ADDED requirement
- [x] 4.2 run `openspec validate --all --strict` and `./scripts/check.sh`
