#!/usr/bin/env bash
set -euo pipefail

# Sync morphoviewer into core-web-app for local dev or vendor publishing.
#
# Usage:
#   pnpm sync-morphoviewer          # rebuild sibling + pack into vendor/ (default)
#   pnpm sync-morphoviewer:vendor   # same; use when committing the tarball for PRs
#
# Both modes pack into vendor/*.tgz and let pnpm install it. Do NOT pre-extract
# the tarball into node_modules — that leaves a bare package without nested deps
# (tslib, @tolokoban/tgd) and blocks pnpm from linking the real store entry.
#
# Override paths:
#   MORPHOVIEWER_LIB=/path/to/morphoviewer/lib
#   CORE_WEB_APP=/path/to/core-web-app

MODE="${1:-dev}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CORE_WEB_APP="${CORE_WEB_APP:-$(cd "${SCRIPT_DIR}/.." && pwd)}"
MORPHOVIEWER_LIB="${MORPHOVIEWER_LIB:-$(cd "${CORE_WEB_APP}/../morphoviewer/lib" 2>/dev/null && pwd || true)}"

if [[ ! -d "${MORPHOVIEWER_LIB}" ]]; then
  echo "morphoviewer lib not found: ${MORPHOVIEWER_LIB:-<empty>}" >&2
  echo "Expected a sibling checkout at ../morphoviewer/lib (or set MORPHOVIEWER_LIB)." >&2
  exit 1
fi

if [[ "${MODE}" != "dev" && "${MODE}" != "vendor" ]]; then
  echo "Unknown mode: ${MODE} (expected: dev | vendor)" >&2
  exit 1
fi

MORPHOVIEWER_VERSION="$(node -p "require('${MORPHOVIEWER_LIB}/package.json').version")"
VENDOR_TGZ="openbraininstitute-morphoviewer-${MORPHOVIEWER_VERSION}.tgz"

echo "→ Building morphoviewer ${MORPHOVIEWER_VERSION} (${MORPHOVIEWER_LIB})"
(
  cd "${MORPHOVIEWER_LIB}"
  npm install
  npm run build
)

set_morphoviewer_dep() {
  local specifier="$1"
  local workspace_link="$2"
  CORE_WEB_APP="${CORE_WEB_APP}" \
  MORPHO_SPECIFIER="${specifier}" \
  MORPHO_WORKSPACE_LINK="${workspace_link}" \
  node <<'NODE'
const fs = require('node:fs');
const path = require('node:path');

const coreWebApp = process.env.CORE_WEB_APP;
const specifier = process.env.MORPHO_SPECIFIER;
const workspaceLink = process.env.MORPHO_WORKSPACE_LINK;

const pkgPath = path.join(coreWebApp, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.dependencies['@openbraininstitute/morphoviewer'] = specifier;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

const wsPath = path.join(coreWebApp, 'pnpm-workspace.yaml');
let ws = fs.readFileSync(wsPath, 'utf8');
const overrideLine = `  '@openbraininstitute/morphoviewer': ${workspaceLink}`;
const overrideRe = /^[ \t]*['"]?@openbraininstitute\/morphoviewer['"]?\s*:.*$/m;

if (overrideRe.test(ws)) {
  ws = ws.replace(overrideRe, overrideLine);
} else if (/^overrides:\s*$/m.test(ws)) {
  ws = ws.replace(/^overrides:\s*$/m, `overrides:\n${overrideLine}`);
} else {
  ws = `${ws.trimEnd()}\noverrides:\n${overrideLine}\n`;
}

// Deduplicate accidental repeated morphoviewer override lines.
const lines = ws.split('\n');
let seenMorphoOverride = false;
ws = lines
  .filter((line) => {
    if (!/^[ \t]*['"]?@openbraininstitute\/morphoviewer['"]?\s*:/.test(line)) {
      return true;
    }
    if (seenMorphoOverride) return false;
    seenMorphoOverride = true;
    return true;
  })
  .join('\n');

fs.writeFileSync(wsPath, ws.endsWith('\n') ? ws : `${ws}\n`);
NODE
}

mkdir -p "${CORE_WEB_APP}/vendor"
echo "→ Packing morphoviewer to ${CORE_WEB_APP}/vendor/${VENDOR_TGZ}"
(
  cd "${MORPHOVIEWER_LIB}"
  rm -f "${CORE_WEB_APP}/vendor/${VENDOR_TGZ}"
  npm pack --pack-destination "${CORE_WEB_APP}/vendor"
)
if [[ ! -f "${CORE_WEB_APP}/vendor/${VENDOR_TGZ}" ]]; then
  echo "Expected pack output missing: vendor/${VENDOR_TGZ}" >&2
  ls -la "${CORE_WEB_APP}/vendor" >&2 || true
  exit 1
fi

find "${CORE_WEB_APP}/vendor" -maxdepth 1 -name 'openbraininstitute-morphoviewer-*.tgz' ! -name "${VENDOR_TGZ}" -delete

set_morphoviewer_dep "file:vendor/${VENDOR_TGZ}" "file:vendor/${VENDOR_TGZ}"

echo "→ Installing core-web-app dependencies"
(
  cd "${CORE_WEB_APP}"
  # Clear stale copies so pnpm can install a proper store entry with nested deps.
  # Do NOT tar-extract into node_modules — a bare extract has no tslib/@tolokoban/tgd
  # and prevents pnpm from creating the linked package under .pnpm/.
  shopt -s nullglob
  rm -rf node_modules/@openbraininstitute/morphoviewer
  rm -rf node_modules/@openbraininstitute/.ignored_morphoviewer
  rm -rf node_modules/.pnpm/@openbraininstitute+morphoviewer@*
  # `pnpm install` alone can no-op when the lockfile already lists the tarball;
  # `pnpm add` forces a real link into node_modules with nested deps.
  pnpm add "@openbraininstitute/morphoviewer@file:vendor/${VENDOR_TGZ}" \
    --prefer-offline \
    --config.resolution-mode=highest \
    --config.minimum-release-age=0 \
    --config.verify-deps-before-run=false
)

echo "→ Verifying resolution"
(
  cd "${CORE_WEB_APP}"
  node <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const requireFromApp = createRequire(path.join(process.cwd(), 'package.json'));
const pkgJson = requireFromApp.resolve('@openbraininstitute/morphoviewer/package.json');
const pkgDir = path.dirname(pkgJson);
const pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf8'));
const main = path.resolve(pkgDir, pkg.main || 'dist/index.js');
const types = path.join(pkgDir, 'dist/components/types.d.ts');
const tslib = requireFromApp.resolve('tslib/package.json', { paths: [pkgDir] });

let link = '(copied / store)';
try {
  link = fs.readlinkSync('node_modules/@openbraininstitute/morphoviewer');
} catch {
  /* not a symlink */
}

console.log('version:', pkg.version);
console.log('main:', main);
console.log('types:', types);
console.log('tslib (from morphoviewer):', tslib);
console.log('node_modules entry:', link);

if (!fs.existsSync(main) || !fs.existsSync(types) || !fs.existsSync(tslib)) {
  console.error('Resolution check failed');
  process.exit(1);
}
NODE
)

echo "✓ morphoviewer synced (${MODE}) → vendor/${VENDOR_TGZ}"
echo "  Restart the Next.js dev server if it is already running."
