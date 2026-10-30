#!/usr/bin/env bash
#
# Type-checks each module of this repository against Pi Pocket's public types, /data/extensions/_pocket.d.ts.
#
# A module is written for the drop-in folder, where `_pocket.d.ts` and `node_modules` are beside it. So this script makes
# a temporary folder that looks like the drop-in folder, puts the module in it, writes a temporary `tsconfig.json` there,
# runs `npx tsc --noEmit`, and deletes the temporary file and folder.
#
# It checks `extensions/<name>/<name>.ts` and the template `extensions/_template/_template.ts`, and it skips `*.test.ts`
# files and other files that start with `_`. It prints the exit code of each module, and one exit code for all of them.
set -uo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
drop_in="${POCKET_DROPIN:-/data/extensions}"
pocket_types="$drop_in/_pocket.d.ts"

if [ ! -f "$pocket_types" ]; then
    echo "check.sh: error: no types at $pocket_types" >&2
    exit 1
fi

work="$(mktemp -d "${TMPDIR:-/tmp}/pp-extensions-check.XXXXXX")" || {
    echo "check.sh: error: could not make a temporary folder" >&2
    exit 1
}
cleanup() {
    rm -rf -- "$work"
}
trap cleanup EXIT

ln -s -- "$pocket_types" "$work/_pocket.d.ts"
if [ -d "$drop_in/node_modules" ]; then
    ln -s -- "$drop_in/node_modules" "$work/node_modules"
fi

shopt -s nullglob
overall=0
checked=0

for file in "$repo_root"/extensions/*/*.ts; do
    folder="$(basename -- "$(dirname -- "$file")")"
    name="$(basename -- "$file" .ts)"

    case "$name" in
        *.test)
            echo "skip: $file: a test file"
            continue
            ;;
    esac
    # The template is checked, so that a copy of it is right. Other files that start with '_' are helpers.
    if [ "$name" != "_template" ] && [ "${name#_}" != "$name" ]; then
        echo "skip: $file: a file that starts with '_' is a helper, not a module"
        continue
    fi
    if [ "$folder" != "$name" ]; then
        echo "skip: $file: the folder name and the file name must be the same"
        continue
    fi

    # The module as the drop-in folder gets it, with the types and the packages beside it.
    cp -- "$file" "$work/$name.ts"
    cat > "$work/tsconfig.json" <<JSON
{
    "compilerOptions": {
        "target": "es2022",
        "module": "nodenext",
        "moduleResolution": "nodenext",
        "strict": true,
        "noEmit": true,
        "skipLibCheck": true,
        "allowImportingTsExtensions": true,
        "types": []
    },
    "files": ["./$name.ts"]
}
JSON

    echo "check: $file against $pocket_types"
    (cd "$work" && npx --yes -p typescript@5 tsc --noEmit -p "$work/tsconfig.json")
    code=$?
    # The temporary tsconfig.json goes after the check of this module.
    rm -f -- "$work/tsconfig.json" "$work/$name.ts"
    checked=$((checked + 1))
    echo "check: $file: exit code $code"
    if [ "$code" -ne 0 ]; then
        overall=$code
    fi
done

if [ "$checked" -eq 0 ]; then
    echo "check.sh: no module to check in $repo_root/extensions"
fi

echo "check.sh: $checked module(s) checked, exit code $overall"
exit "$overall"
