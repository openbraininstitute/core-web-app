#!/usr/bin/env bash
set -euo pipefail

# Sync morphoviewer into core-web-app for local dev or vendor publishing.
#
# Usage:
#   pnpm sync-morphoviewer          # link local morphoviewer/lib (default)
#   pnpm sync-morphoviewer:vendor   # pack to vendor/*.tgz for PRs
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

case "${MODE}" in
  dev)
    # Sibling morphoviewer checkout (repo root). Published layout is under lib/dist;
    # the root package.json points main at ./lib/dist/index.js.
    RELATIVE_SPEC="file:../morphoviewer"
    WORKSPACE_LINK="link:../morphoviewer"
    echo "→ Linking core-web-app to ${RELATIVE_SPEC}"
    set_morphoviewer_dep "${RELATIVE_SPEC}" "${WORKSPACE_LINK}"
    ;;
  vendor)
    mkdir -p "${CORE_WEB_APP}/vendor"
    echo "→ Packing morphoviewer to ${CORE_WEB_APP}/vendor/${VENDOR_TGZ}"
    (
      cd "${MORPHOVIEWER_LIB}"
      # Remove stale packs with the same name so npm pack output is predictable.
      rm -f "${CORE_WEB_APP}/vendor/${VENDOR_TGZ}"
      npm pack --pack-destination "${CORE_WEB_APP}/vendor"
    )
    if [[ ! -f "${CORE_WEB_APP}/vendor/${VENDOR_TGZ}" ]]; then
      echo "Expected pack output missing: vendor/${VENDOR_TGZ}" >&2
      ls -la "${CORE_WEB_APP}/vendor" >&2 || true
      exit 1
    fi
    set_morphoviewer_dep "file:vendor/${VENDOR_TGZ}" "file:vendor/${VENDOR_TGZ}"
    ;;
  *)
    echo "Unknown mode: ${MODE} (expected: dev | vendor)" >&2
    exit 1
    ;;
esac

echo "→ Installing core-web-app dependencies"
(
  cd "${CORE_WEB_APP}"
  # Drop stale linked/copied package so pnpm cannot keep an outdated resolution.
  rm -rf node_modules/@openbraininstitute/morphoviewer
  rm -rf node_modules/.pnpm/@openbraininstitute+morphoviewer@*
  if [[ "${MODE}" == "vendor" ]]; then
    mkdir -p node_modules/@openbraininstitute/morphoviewer
    tar -xzf "vendor/${VENDOR_TGZ}" -C node_modules/@openbraininstitute/morphoviewer --strip-components=1
  fi
  pnpm install --prefer-offline --config.resolution-mode=highest --config.minimum-release-age=0 --config.verify-deps-before-run=false
)

echo "→ Verifying resolution"
(
  cd "${CORE_WEB_APP}"
  node <<'NODE'
const fs = require('node:fs');
const resolved = require.resolve('@openbraininstitute/morphoviewer');
const types = require.resolve('@openbraininstitute/morphoviewer/dist/components/types');
let link = '(copied / store)';
try {
  link = fs.readlinkSync('node_modules/@openbraininstitute/morphoviewer');
} catch {
  /* not a symlink */
}
console.log('main:', resolved);
console.log('types deep import:', types);
console.log('node_modules entry:', link);
if (!fs.existsSync(resolved) || !fs.existsSync(types)) {
  console.error('Resolution check failed');
  process.exit(1);
}
NODE
)

echo "✓ morphoviewer synced (${MODE})"
echo "  Restart the Next.js dev server if it is already running."
