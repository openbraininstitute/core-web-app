/**
 * Parameter names of a distance-dependent distribution `function`, derived from the function text
 * itself. Per obi-one PR #1105, the function is the single source of truth for its parameters:
 * every `{placeholder}` other than the reserved runtime ones is a parameter, so the frontend reads
 * these names straight from the string to drive the sibling `distribution_parameter_list` rows and
 * no parameter list is sent to the validation endpoint.
 */

/** Placeholders filled by BluePyEModel at runtime; never user parameters. */
export const RESERVED_PLACEHOLDERS: ReadonlySet<string> = new Set([
  'value',
  'distance',
  'step_begin',
  'step_end',
]);

// A bare `{name}` placeholder. The backend rejects anything fancier inside the braces (format
// specs, attributes, indices), so matching bare identifiers mirrors what counts as a placeholder.
const PLACEHOLDER_RE = /\{([A-Za-z_]\w*)\}/g;

/**
 * The extra placeholder names used in `fn`, in order of first appearance and de-duplicated,
 * excluding the reserved runtime placeholders. These are the parameters the user must give a value.
 */
export function functionParameterNames(fn: string): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const match of fn.matchAll(PLACEHOLDER_RE)) {
    const name = match[1];
    if (RESERVED_PLACEHOLDERS.has(name) || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  return names;
}
