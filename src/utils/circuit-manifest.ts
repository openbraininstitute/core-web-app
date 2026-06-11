import escapeRegExp from 'es-toolkit/compat/escapeRegExp';
import isEmpty from 'es-toolkit/compat/isEmpty';
import reduce from 'es-toolkit/compat/reduce';

function sanitizePath(path: string): string {
  let sanitized = path.replace(/^\.\//, ''); // Remove leading ./
  sanitized = sanitized.replace(/^\/+/, ''); // Remove leading slashes
  return sanitized;
}

/**
 * Resolves SONATA `circuit_config.json` manifest variables in a path.
 *
 * Manifest entries are `$VAR` keys that may reference one another, e.g.
 * `$NETWORK_NODES_DIR` -> `$BASE_DIR/networks/nodes` -> `.`. We iterate
 * (up to `maxIterations`) replacing every key globally until the path is
 * stable, then strip a leading `./` or `/`.
 *
 * Note: replacement order follows manifest insertion order and is not sorted
 * longest-key-first, so overlapping keys (e.g. `$NET` vs `$NETWORK`) could
 * collide. Real circuit manifests don't define such keys; this matches the
 * behavior previously shipped by the circuit download panel.
 */
export function resolveManifestPath(path: string, manifest?: Record<string, string>): string {
  if (!manifest || isEmpty(manifest)) {
    return sanitizePath(path);
  }

  let resolvedPath = path;
  const maxIterations = 50; // Prevent infinite loops
  let iteration = 0;

  // Keep replacing variables until no more variables exist or max iterations reached
  while (resolvedPath.includes('$') && iteration < maxIterations) {
    const previousPath = resolvedPath;

    // Use es-toolkit's reduce for efficient variable replacement
    resolvedPath = reduce(
      manifest,
      (currentPath, value, key) => {
        // Use global regex replace for all occurrences
        return currentPath.replace(new RegExp(escapeRegExp(key), 'g'), value);
      },
      resolvedPath
    );

    // Break if no changes were made (no more replacements possible)
    if (previousPath === resolvedPath) {
      break;
    }

    iteration++;
  }

  return sanitizePath(resolvedPath);
}

/**
 * Collapses `.` and `..` segments (and empty segments) in a relative path.
 * `a/./b/../c` -> `a/c`. A leading `..` with nothing to pop is a no-op.
 */
export function normalizeRelativePath(path: string): string {
  const result: string[] = [];
  for (const part of path.split('/')) {
    if (typeof part !== 'string' || part.trim().length === 0 || part === '.') continue;
    if (part === '..') {
      result.pop();
      continue;
    }
    result.push(part);
  }
  return result.join('/');
}
