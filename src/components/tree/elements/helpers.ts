/* eslint-disable no-param-reassign */
import transform from 'lodash/transform';
import isObject from 'lodash/isObject';
import isArray from 'lodash/isArray';

import type { TTreeNode } from '@/components/tree/types';

/**
 * Recursively flattens a tree structure into a flat list of nodes.
 * Each node in the list will have a `parentId` property, except for the root node.
 *
 * @template TNode - The type of the tree node, which must extend `TTreeNode`.
 * @param nodes - The array of tree nodes to flatten.
 * @param parentId - The ID of the parent node, or `null` if the node is a root. Defaults to `null`.
 * @returns An array of nodes where each node includes a `parentId` property indicating its parent.
 */
export function flattenTree<TNode extends TTreeNode>(
  nodes: TNode[],
  parentId: string | null = null
): (TNode & { parentId: string | null })[] {
  let flatList: (TNode & { parentId: string | null })[] = [];
  for (const node of nodes) {
    flatList.push({ ...node, parentId });
    if (node.children && node.children.length > 0) {
      flatList = flatList.concat(flattenTree(node.children as TNode[], node.id));
    }
  }
  return flatList;
}

/**
 * Flattens a tree structure into a flat array of nodes.
 *
 * Traverses the tree starting from the given node and accumulates all nodes
 * into a single array in depth-first order.
 *
 * @typeParam TNode - The type of the tree node, which must extend `TTreeNode`.
 * @param node - The root node to start flattening from.
 * @param result - (Optional) The accumulator array for the flattened nodes. Used internally for recursion.
 * @returns An array containing all nodes in the tree, flattened in depth-first order.
 */
export const flattenTreeAsObject = <TNode extends TTreeNode>(
  node: TNode,
  result: TNode[] = []
): TNode[] => {
  result.push(node);

  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      flattenTreeAsObject(child, result);
    }
  }

  return result;
};

/**
 * Finds a node by its ID in a tree structure.
 */
/**
 * Recursively searches for a node within a tree structure by matching a specified key's value to a given id.
 *
 * @template TNode - The type of the tree node, extending TTreeNode.
 * @param key - The property name of the node to match against the id.
 * @param id - The value to search for within the specified key of each node.
 * @param rootNode - The root node of the tree to start the search from.
 * @returns The node whose specified key matches the given id, or null if no such node is found.
 */
export function findNodeByKey<TNode extends TTreeNode>(
  key: string,
  id: string | number,
  rootNode: TNode
): TNode | null {
  if (rootNode[key as keyof TNode]?.toString() === id.toString()) {
    return rootNode;
  }

  if (rootNode.children) {
    for (const child of rootNode.children as TNode[]) {
      const found = findNodeByKey(key, id, child);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

/**
 * Finds and returns the list of parent nodes from the specified target node up to the root node.
 *
 * Traverses the tree starting from the given root node to locate the node with the specified `targetId`.
 * Once found, it returns an array of ancestor nodes (excluding the target node itself), ordered from the root down to the immediate parent of the target node.
 *
 * @typeParam TNode - The type of the tree node, which must extend `TTreeNode`.
 * @param targetId - The unique identifier of the target node whose parent path is to be found.
 * @param rootNode - The root node of the tree to search within.
 * @returns An array of parent nodes from the root to the immediate parent of the target node.
 *          Returns an empty array if the target node is not found or if it is the root node itself.
 */
export function getParentsToRoot<TNode extends TTreeNode>(
  targetId: string,
  rootNode: TNode
): TNode[] {
  function findPath(currentNode: TNode, currentPath: TNode[]): TNode[] | null {
    if (currentNode.id === targetId) {
      // Target found. The currentPath contains all its ancestors.
      // Return the path excluding the target node itself, only parents.
      return currentPath;
    }
    if (currentNode.children) {
      for (const child of currentNode.children as TNode[]) {
        // The new path for the child's search includes the `currentNode` as an ancestor.
        const pathFromChild = findPath(child, [...currentPath, currentNode]);
        if (pathFromChild) {
          return pathFromChild;
        }
      }
    }
    return null;
  }
  const parentPath = findPath(rootNode, []);
  return parentPath || [];
}

/**
 * Scrolls the page to bring the DOM element corresponding to the given tree node into view.
 *
 * @template TNode - The type of the tree node, extending TTreeNode.
 * @param node - The tree node whose associated DOM element should be scrolled into view. If null, the function does nothing.
 *
 * The function searches for a DOM element with a `data-node-id` attribute matching the node's `id`.
 * If found, it smoothly scrolls the element into the center of the viewport.
 * If the node is null or the code is not running in a browser environment, the function exits early.
 */
export function scrollToNode<TNode extends TTreeNode>(
  node: TNode | null,
  block: ScrollLogicalPosition = 'nearest'
): void {
  if (!node || typeof document === 'undefined') return;

  const element = document.querySelector(`[data-node-id="${node.id}"]`);
  if (element) {
    setTimeout(() => {
      element.scrollIntoView({
        behavior: 'smooth',
        block,
      });
    }, 50);
  }
}

/**
 * Searches for nodes in the tree whose names match the query text (case-insensitive).
 * Returns a list of matching node IDs.
 * Assumes TNode might have an optional 'name' property.
 */
export function searchNodes<TNode extends TTreeNode & { name?: string }>(
  query: string,
  rootNode: TNode
): string[] {
  const results: string[] = [];
  const lowerCaseQuery = query.toLowerCase();

  function traverse(node: TNode) {
    if (node.name && node.name.toLowerCase().includes(lowerCaseQuery)) {
      results.push(node.id);
    }
    if (node.children) {
      for (const child of node.children as TNode[]) {
        traverse(child);
      }
    }
  }

  if (rootNode) traverse(rootNode);
  return results;
}

/**
 * Recursively renames a specified key in an object and all of its nested objects or arrays.
 *
 * @template T - The type of the input object.
 * @param obj - The object to process. If `null`, the function returns `null`.
 * @param field - The key name to be renamed throughout the object.
 * @param newKey - The new key name to replace the old key.
 * @returns A new object with the specified key renamed at all levels, or `null` if the input is `null`.
 *
 * @example
 * ```typescript
 * const obj = { a: 1, b: { a: 2 }, c: [{ a: 3 }] };
 * const result = renameKeyDeep(obj, 'a', 'x');
 * // result: { x: 1, b: { x: 2 }, c: [{ x: 3 }] }
 * ```
 */
export function renameKeyDeep<T extends Record<string, any>>(
  obj: T | null,
  field: string,
  newKey: string
): T | null {
  if (!obj) return null;

  return transform(obj, (result, value, key) => {
    if (!result) return;

    const sanitizedField = key === field ? newKey : key;
    const dic = result as Record<string, any>;
    if (isArray(value)) {
      dic[sanitizedField] = value.map((item) => renameKeyDeep(item, field, newKey));
    } else if (isObject(value)) {
      dic[sanitizedField] = renameKeyDeep(value, field, newKey);
    } else {
      dic[sanitizedField] = value;
    }
  });
}
