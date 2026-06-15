import isEmpty from 'es-toolkit/compat/isEmpty';

function sanitizePath(path: string): string {
  let sanitized = path.replace(/^\.\//, ''); // Remove leading ./
  sanitized = sanitized.replace(/^\/+/, ''); // Remove leading slashes
  return sanitized;
}

/**
 * Resolves SONATA `circuit_config.json` manifest variables in a path.
 *
 * Manifest entries are `$VAR` keys that may reference one another, possibly
 * transitively, e.g. `$NETWORK_NODES_DIR` -> `$NETWORK/nodes` ->
 * `$BASE_DIR/networks/nodes` -> `.`. We iterate (up to `maxIterations`)
 * replacing every `$VAR` token until the path is stable, then strip a leading
 * `./` or `/`.
 *
 * Each pass matches whole `$VAR` tokens (greedy `\$[A-Za-z_][A-Za-z0-9_]*`) and
 * looks each up in the manifest, so prefix-overlapping keys (e.g. `$NETWORK` vs
 * `$NETWORK_NODES_DIR`) never collide. Unknown tokens are left intact, which
 * makes the next pass a no-op and terminates the loop. Cyclic manifests stop at
 * `maxIterations`.
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

    // Match whole `$VAR` tokens and look each up; unknown tokens pass through
    // unchanged. Matching whole tokens avoids prefix-overlap collisions.
    resolvedPath = resolvedPath.replace(/\$[A-Za-z_][A-Za-z0-9_]*/g, (token) =>
      token in manifest ? manifest[token] : token
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
