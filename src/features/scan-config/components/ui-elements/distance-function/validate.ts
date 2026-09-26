import { parse } from 'acorn';

import type { Node } from 'acorn';

/**
 * Client-side mirror of the obi-one `validate_safe_distance_function` whitelist.
 *
 * The backend is the real security boundary (it runs the same check before the string ever
 * reaches BluePyEModel's `eval()`). This exists purely for instant, in-editor feedback: it
 * parses the function into an AST and rejects anything outside a small arithmetic whitelist,
 * reporting the exact character span of the first offending node.
 *
 * Keep the allow-lists below in sync with obi-one
 * (obi_one/scientific/tasks/emodel_building/task2_emodel_optimization/blocks.py).
 */

// Placeholders like `{value}`/`{distance}` are not valid JS. We swap each for a numeric token
// of the SAME length so acorn parses it and every node offset still points at the original text.
const PLACEHOLDER = /\{(\w+)\}/g;

const ALLOWED_CALL_NAMES = new Set(['int', 'float', 'abs', 'min', 'max']);
// `math` (Python) and `Math` (JS) both allowed: users write Python `math.exp`, and the same
// expression parses in JS where `Math` is the native object.
const ALLOWED_MODULES = new Set(['math', 'Math']);
const ALLOWED_NAMES = new Set([...ALLOWED_CALL_NAMES, ...ALLOWED_MODULES]);

const ALLOWED_BINARY_OPERATORS = new Set([
  '+',
  '-',
  '*',
  '/',
  '%',
  '**',
  '&',
  '|',
  '==',
  '!=',
  '<',
  '<=',
  '>',
  '>=',
]);
const ALLOWED_LOGICAL_OPERATORS = new Set(['&&', '||']);
const ALLOWED_UNARY_OPERATORS = new Set(['-', '+', '!']);

export interface DistanceFunctionError {
  from: number;
  to: number;
  message: string;
}

/** Replace `{name}` with a same-length numeric literal so offsets are preserved. */
function stripPlaceholders(fn: string): string {
  return fn.replace(PLACEHOLDER, (match) => '1'.padEnd(match.length, '0'));
}

/** Return the reason a node is disallowed, or null if it is safe. */
function nodeError(node: Node): string | null {
  switch (node.type) {
    case 'Program':
    case 'ExpressionStatement':
    case 'Literal':
      return null;
    case 'BinaryExpression': {
      const op = (node as unknown as { operator: string }).operator;
      return ALLOWED_BINARY_OPERATORS.has(op) ? null : `disallowed operator: ${op}`;
    }
    case 'LogicalExpression': {
      const op = (node as unknown as { operator: string }).operator;
      return ALLOWED_LOGICAL_OPERATORS.has(op) ? null : `disallowed operator: ${op}`;
    }
    case 'UnaryExpression': {
      const op = (node as unknown as { operator: string }).operator;
      return ALLOWED_UNARY_OPERATORS.has(op) ? null : `disallowed operator: ${op}`;
    }
    case 'Identifier': {
      const name = (node as unknown as { name: string }).name;
      return ALLOWED_NAMES.has(name) ? null : `disallowed name: '${name}'`;
    }
    case 'MemberExpression': {
      const member = node as unknown as { object: Node; computed: boolean };
      const objectIsModule =
        member.object.type === 'Identifier' &&
        ALLOWED_MODULES.has((member.object as unknown as { name: string }).name);
      if (member.computed || !objectIsModule) {
        return 'attributes may only be accessed on the math module';
      }
      return null;
    }
    case 'CallExpression': {
      const call = node as unknown as { callee: Node };
      const callee = call.callee;
      const isModuleCall =
        callee.type === 'MemberExpression' &&
        (callee as unknown as { object: Node }).object.type === 'Identifier' &&
        ALLOWED_MODULES.has(
          ((callee as unknown as { object: Node }).object as unknown as { name: string }).name
        );
      const isBuiltinCall =
        callee.type === 'Identifier' &&
        ALLOWED_CALL_NAMES.has((callee as unknown as { name: string }).name);
      if (!isModuleCall && !isBuiltinCall) {
        return `calls are limited to math.* and ${[...ALLOWED_CALL_NAMES].sort().join(', ')}`;
      }
      return null;
    }
    default:
      return `disallowed expression: ${node.type}`;
  }
}

/**
 * Validate a distance function. Returns the first error with its character span in the
 * original string, or null if the function is safe and uses only allowed placeholders.
 *
 * Allowed placeholders mirror obi-one: `{value}` and `{distance}` are always allowed and
 * required; any name listed in `declaredParameters` is also allowed. Anything else (e.g.
 * `{hello}`) is rejected.
 */
export function validateDistanceFunction(
  fn: string,
  declaredParameters: readonly string[] = []
): DistanceFunctionError | null {
  const expression = stripPlaceholders(fn);

  let tree: Node;
  try {
    tree = parse(expression, { ecmaVersion: 2020 });
  } catch (err) {
    const pos = err instanceof SyntaxError && 'pos' in err ? Number(err.pos) : 0;
    return {
      from: Number.isFinite(pos) ? pos : 0,
      to: fn.length,
      message: 'Not a valid expression.',
    };
  }

  let found: DistanceFunctionError | null = null;
  walk(tree, (node) => {
    if (found) return;
    const reason = nodeError(node);
    if (reason) {
      found = { from: node.start, to: node.end, message: `Distance function contains ${reason}.` };
    }
  });
  if (found) return found;

  return placeholderError(fn, declaredParameters);
}

/** Reject unknown placeholders and require `{value}`/`{distance}`, mirroring the backend. */
function placeholderError(
  fn: string,
  declaredParameters: readonly string[]
): DistanceFunctionError | null {
  const allowed = new Set(['value', 'distance', ...declaredParameters]);
  for (const match of fn.matchAll(PLACEHOLDER)) {
    const name = match[1];
    if (!allowed.has(name)) {
      return {
        from: match.index,
        to: match.index + match[0].length,
        message: `Unknown placeholder '{${name}}'. Only {value}, {distance}${
          declaredParameters.length
            ? `, and declared parameters (${declaredParameters.join(', ')})`
            : ''
        } are allowed.`,
      };
    }
  }
  for (const required of ['value', 'distance']) {
    if (!fn.includes(`{${required}}`)) {
      return {
        from: 0,
        to: fn.length,
        message: `Distance function must contain the {${required}} placeholder.`,
      };
    }
  }
  return null;
}

/** Depth-first walk over every node in the acorn tree. */
function walk(node: Node, visit: (node: Node) => void): void {
  visit(node);
  // For `math.exp`, the attribute name `exp` is an Identifier child. It is not a standalone
  // reference (the MemberExpression check already validated the whole access), so skip it,
  // matching Python's ast where `Attribute.attr` is a bare string, not a Name node.
  const skipProperty =
    node.type === 'MemberExpression' && !(node as unknown as { computed: boolean }).computed;
  for (const key of Object.keys(node)) {
    if (skipProperty && key === 'property') continue;
    const child = (node as unknown as Record<string, unknown>)[key];
    if (Array.isArray(child)) {
      for (const item of child) {
        if (isNode(item)) walk(item, visit);
      }
    } else if (isNode(child)) {
      walk(child, visit);
    }
  }
}

function isNode(value: unknown): value is Node {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string' &&
    typeof (value as { start?: unknown }).start === 'number'
  );
}
