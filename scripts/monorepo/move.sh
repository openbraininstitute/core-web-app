#!/bin/bash
# Moves the app into apps/web/, and ports open branches across that move.
#
#   move.sh move                 make the move-only commit (run once, on the monorepo branch)
#   move.sh port [PRE] [MONO]    bring the current branch across the move
#                                PRE  = last main commit before the move (default: tag pre-monorepo)
#                                MONO = main after the move             (default: origin/main)
#
# Why `port` instead of `git merge main`: a plain merge relies on git rename detection, which
# leaves files the branch added in the old src/ and swaps paths of identical files (24 such
# groups on main). `port` re-applies the branch's own diff with paths prefixed, so no detection.
set -euo pipefail

APP=apps/web
MOVED=(src public types tarball next.config.ts tsconfig.json postcss.config.js global.d.ts
       empty-module.ts vitest.config.ts vitest.setup.ts sentry.edge.config.ts sentry.server.config.ts
       knip.json .env .env.development .env.production .env.test Dockerfile package.json
       scripts/sync-morphoviewer.sh)

move() {
  for p in "${MOVED[@]}"; do
    [ -e "$p" ] || continue
    mkdir -p "$APP/$(dirname "$p")"
    git mv "$p" "$APP/$p"
  done
}

port() {
  local pre=${1:-pre-monorepo} mono=${2:-origin/main}
  local patch
  patch="$(git rev-parse --git-dir)/monorepo-port.patch"
  git diff --quiet && git diff --cached --quiet || { echo "Commit or stash your changes first." >&2; exit 1; }
  git merge-base --is-ancestor "$pre" HEAD ||
    { echo "Merge $pre into this branch first and resolve as usual, then run port again." >&2; exit 1; }
  git merge-base --is-ancestor "$mono" HEAD && { echo "Already ported."; exit 0; }

  # the branch's own changes since $pre: app paths gain the apps/web/ prefix, the rest stay
  git diff --binary --full-index --no-renames --src-prefix="a/$APP/" --dst-prefix="b/$APP/" \
    "$pre" HEAD -- "${MOVED[@]}" > "$patch"
  git diff --binary --full-index --no-renames "$pre" HEAD -- . \
    $(printf ':(exclude)%s ' "${MOVED[@]}") >> "$patch"

  # a merge commit with $mono as parent (no force push, GitHub diff stays the branch's own changes),
  # whose tree is $mono plus the patch
  git merge -s ours --no-commit --no-ff -q "$mono"
  git read-tree --reset -u "$mono"
  if git apply --3way --index --whitespace=nowarn "$patch"; then
    rm -f "$patch"
    # hooks off: the tree is main plus the branch's already-checked changes; biome --write on
    # every moved file would rewrite content
    LEFTHOOK=0 git commit -q --no-edit -m "Port branch to the monorepo layout"
    echo "Ported cleanly."
  else
    echo "Resolve the conflicted files above, then: git commit" >&2
  fi
  if git diff --name-only "$mono" HEAD -- pnpm-lock.yaml "$APP/package.json" | grep -q .; then
    echo "Dependencies changed: run pnpm install and commit pnpm-lock.yaml." >&2
  fi
}

case "${1:-}" in
  move) move ;;
  port) shift; port "$@" ;;
  *) sed -n '2,10p' "$0"; exit 1 ;;
esac
