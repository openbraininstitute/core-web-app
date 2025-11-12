import { cloneDeep, isArray, isObject, toPairs } from 'es-toolkit/compat';

/**
 * fixes JSON Schema prefixItems by inferring the items schema from the last prefix item.
 * This function handles schemas that use the `prefixItems` keyword by ensuring proper item validation.
 *
 * @param schema - The input JSON Schema object to process
 * @template T - The type of the schema object, must extend Record<string,any>
 * @returns A new schema with prefixItems properly handled
 *
 * @example
 * const schema = {
 *   prefixItems: [
 *     { type: "string" },
 *     { type: "number" }
 *   ]
 * };
 * const fixed = normalizePrefixItems(schema);
 * // Result will include items schema inferred from last prefixItem
 */
export function normalizePrefixItems<T extends Record<string, any>>(schema: T): T {
  // deep clone input to avoid mutating user-supplied schema
  const copy = cloneDeep(schema);

  /**
   * define a recursive helper to walk through nested schema nodes.
   * It modifies the current node if needed and recurses into its children.
   */
  function traverse(node: any): any {
    if (!isObject(node)) return node;

    const nodeObj = node as Record<string, any>;

    // handle schemas that use `prefixItems`
    if (isArray(nodeObj.prefixItems)) {
      // if "items" is not already defined, infer it from the last prefix item
      if (!nodeObj.items && nodeObj.prefixItems.length > 0) {
        nodeObj.items = cloneDeep(nodeObj.prefixItems.at(-1));
      }
    }

    // recurse into all nested values (properties, definitions, etc.)
    for (const [key, value] of toPairs(nodeObj)) {
      if (isObject(value)) {
        nodeObj[key] = traverse(value);
      } else if (isArray(value)) {
        nodeObj[key] = value.map((v) => traverse(v));
      }
    }

    return nodeObj;
  }

  // begin recursive traversal from the top-level schema
  return traverse(copy);
}
