#!/usr/bin/env bash
#
# Runs the 2 checks of this repository against Pi Pocket's public types, `_pocket.d.ts` in the drop-in folder: it
# compares the built-in tool names of each module that keeps a copy with the host's set, and it type-checks each module.
#
# The first check reads the host's `BUILT_IN_TOOLS` set in the app source beside the types, and the copy that a module
# keeps. It fails when the 2 sets differ, and it prints a skip when the app source is absent.
#
# The second check is about types. A module is written for the drop-in folder, where `_pocket.d.ts` and `node_modules`
# are beside it. So this script makes a temporary folder that looks like the drop-in folder, puts the module in it, writes
# a temporary `tsconfig.json` there, runs `npx tsc --noEmit`, and deletes the temporary file and folder.
#
# It checks `extensions/<name>/<name>.ts` and the template `extensions/_template/_template.ts`, and it skips `*.test.ts`
# files and other files that start with `_`. It prints the exit code of each module, and one exit code for all of them.
set -uo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
drop_in="${POCKET_DROPIN:-${PI_POCKET_DIR:-$HOME/.pi-pocket}/extensions}"
pocket_types="$drop_in/_pocket.d.ts"

if [ ! -f "$pocket_types" ]; then
    echo "check.sh: error: no types at $pocket_types" >&2
    echo "check.sh: PI_POCKET_DIR decides that path: set it to Pi Pocket's data folder, or set POCKET_DROPIN to the extensions folder itself." >&2
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

# Prints the member names of 1 built-in inventory: the quoted names between the anchor line and the closing `]);`. A
# comment line inside the block holds no quoted name on its own, so it is not read.
inventory_names() {
    awk -v anchor="$2" '
        {
            if (in_block) {
                if ($0 ~ /^[[:space:]]*\]\);/) {
                    exit
                }
                name = $0
                sub(/^[[:space:]]+/, "", name)
                sub(/[[:space:]]+$/, "", name)
                if (name ~ /^"[^"]+",?$/) {
                    sub(/^"/, "", name)
                    sub(/",?$/, "", name)
                    print name
                }
            } else if (index($0, anchor) > 0) {
                in_block = 1
            }
        }
    ' "$1"
}

# The comparison of the built-in tool names, before the type-check loop. A wrong inventory makes the fail-closed data of
# the mode gate wrong, so a difference stops the run here, before any type check, and a missing app source only skips.
host_anchor='BUILT_IN_TOOLS: ReadonlySet<string> = new Set(['
module_anchor='BUILT_IN_TOOL_NAMES = new Set(['
# `_pocket.d.ts` is a symlink into the app, and the host set is at `src/server/reload.ts` from the app's root.
host_file="$(dirname -- "$(dirname -- "$(readlink -f -- "$pocket_types")")")/src/server/reload.ts"

if [ ! -f "$host_file" ]; then
    # Rule 4: an installed app without source has no such file, and the type checks below still run.
    echo "skip: no host source at $host_file: the built-in tool names are not compared"
else
    # Rule 2: a host file that holds no anchor is a failure, and the message names the anchor it looked for.
    if ! grep -qF -- "$host_anchor" "$host_file"; then
        echo "check.sh: error: $host_file holds no built-in tool inventory: the anchor '$host_anchor' is absent" >&2
        exit 1
    fi

    inventory_names "$host_file" "$host_anchor" | sort -u > "$work/host-names.txt"
    # Rule 3: every module that holds the anchor is read, so a second module with a copy is covered too.
    : > "$work/module-names.txt"
    modules=0
    for file in "$repo_root"/extensions/*/*.ts; do
        if ! grep -qF -- "$module_anchor" "$file"; then
            continue
        fi
        inventory_names "$file" "$module_anchor" >> "$work/module-names.txt"
        modules=$((modules + 1))
    done
    sort -u -o "$work/module-names.txt" "$work/module-names.txt"

    host_count="$(wc -l < "$work/host-names.txt" | tr -d '[:space:]')"
    module_count="$(wc -l < "$work/module-names.txt" | tr -d '[:space:]')"

    # Rule 1: a run that reads 0 names on a side is a failure, never a pass.
    if [ "$host_count" -eq 0 ] || [ "$module_count" -eq 0 ]; then
        echo "check.sh: error: no built-in tool names read: $host_count in $host_file, $module_count in $modules module copy/copies" >&2
        exit 1
    fi

    echo "check: built-in tool names: $host_count in $host_file, $module_count in $modules module copy/copies"

    only_module="$(comm -13 "$work/host-names.txt" "$work/module-names.txt")"
    only_host="$(comm -23 "$work/host-names.txt" "$work/module-names.txt")"
    if [ -z "$only_host" ] && [ -z "$only_module" ]; then
        echo "check: built-in tool names: the 2 sets are equal"
    else
        echo "check.sh: error: the built-in tool names differ" >&2
        while IFS= read -r name; do
            if [ -n "$name" ]; then
                echo "check.sh: error: in the module copies, not in $host_file: $name" >&2
            fi
        done <<< "$only_module"
        while IFS= read -r name; do
            if [ -n "$name" ]; then
                echo "check.sh: error: in $host_file, not in the module copies: $name" >&2
            fi
        done <<< "$only_host"
        exit 1
    fi
fi

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
