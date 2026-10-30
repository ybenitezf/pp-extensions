#!/usr/bin/env bash
#
# Links each module of this repository into Pi Pocket's drop-in folder, so that Pi Pocket can load it.
#
#   extensions/<name>/<name>.ts  ->  /data/extensions/<name>.ts  (a symbolic link)
#
# It skips the folder `extensions/_template`, files that start with `_`, and `*.test.ts` files: Pi Pocket does not load
# them as modules. It never replaces a link that points outside this repository: it prints a warning instead.
# Set POCKET_DROPIN to link into another folder, for a test.
set -uo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
drop_in="${POCKET_DROPIN:-/data/extensions}"

if [ ! -d "$drop_in" ]; then
    echo "link.sh: error: the drop-in folder does not exist: $drop_in" >&2
    exit 1
fi

shopt -s nullglob
count=0
skipped=0

for file in "$repo_root"/extensions/*/*.ts; do
    folder="$(basename -- "$(dirname -- "$file")")"
    name="$(basename -- "$file" .ts)"

    if [ "$folder" = "_template" ]; then
        echo "skip: $file: the template is copied, never linked"
        skipped=$((skipped + 1))
        continue
    fi
    case "$name" in
        _*)
            echo "skip: $file: a file that starts with '_' is a helper, not a module"
            skipped=$((skipped + 1))
            continue
            ;;
        *.test)
            echo "skip: $file: a test file"
            skipped=$((skipped + 1))
            continue
            ;;
    esac
    if [ "$folder" != "$name" ]; then
        echo "skip: $file: the folder name and the file name must be the same"
        skipped=$((skipped + 1))
        continue
    fi

    target="$file"
    link="$drop_in/$name.ts"

    if [ -L "$link" ]; then
        # Where the existing link goes, with all its parts resolved.
        current="$(readlink -f -- "$link" 2>/dev/null || true)"
        case "$current" in
            "$repo_root"/*)
                if [ "$current" = "$target" ]; then
                    echo "ok: $link already points to $target"
                    count=$((count + 1))
                    continue
                fi
                echo "replace: $link: it pointed to $current"
                ;;
            *)
                echo "warning: $link points to $current, which is outside $repo_root: not replaced" >&2
                skipped=$((skipped + 1))
                continue
                ;;
        esac
    elif [ -e "$link" ]; then
        echo "warning: $link is a file or a folder, not a link: not replaced" >&2
        skipped=$((skipped + 1))
        continue
    fi

    if ln -sfn -- "$target" "$link"; then
        echo "link: $link -> $target"
        count=$((count + 1))
    else
        echo "link.sh: error: could not make the link $link" >&2
        exit 1
    fi
done

echo "link.sh: $count module(s) linked in $drop_in, $skipped skipped"
