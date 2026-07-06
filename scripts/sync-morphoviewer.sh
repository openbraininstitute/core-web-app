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
VENDOR_TGZ="openbraininstitute-morphoviewer-0.30.0.tgz"

if [[ ! -d "${MORPHOVIEWER_LIB}" ]]; then
  echo "morphoviewer lib not found: ${MORPHOVIEWER_LIB}" >&2
  echo "Expected a sibling checkout at ../morphoviewer/lib (or set MORPHOVIEWER_LIB)." >&2
  exit 1
fi

echo "→ Building morphoviewer (${MORPHOVIEWER_LIB})"
(
  cd "${MORPHOVIEWER_LIB}"
  npm install
  npm run build
)

set_morphoviewer_dep() {
  local specifier="$1"
  node -e "
    const fs = require('node:fs');
    const path = require('node:path');
    const pkgPath = path.join('${CORE_WEB_APP}', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    pkg.dependencies['@openbraininstitute/morphoviewer'] = '${specifier}';
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  "
}

case "${MODE}" in
  dev)
    RELATIVE_SPEC="file:../morphoviewer/lib"
    echo "→ Linking core-web-app to ${RELATIVE_SPEC}"
    set_morphoviewer_dep "${RELATIVE_SPEC}"
    ;;
  vendor)
    echo "→ Packing morphoviewer to ${CORE_WEB_APP}/vendor/${VENDOR_TGZ}"
    (
      cd "${MORPHOVIEWER_LIB}"
      npm pack --pack-destination "${CORE_WEB_APP}/vendor"
    )
    set_morphoviewer_dep "file:vendor/${VENDOR_TGZ}"
    ;;
  *)
    echo "Unknown mode: ${MODE} (expected: dev | vendor)" >&2
    exit 1
    ;;
esac

echo "→ Installing core-web-app dependencies"
(
  cd "${CORE_WEB_APP}"
  if [[ "${MODE}" == "vendor" ]]; then
    rm -rf node_modules/@openbraininstitute/morphoviewer
    mkdir -p node_modules/@openbraininstitute/morphoviewer
    tar -xzf "vendor/${VENDOR_TGZ}" -C node_modules/@openbraininstitute/morphoviewer --strip-components=1
  fi
  pnpm install --config.minimum-release-age=0
)

echo "✓ morphoviewer synced (${MODE})"
