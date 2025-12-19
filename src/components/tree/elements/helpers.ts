/* eslint-disable no-param-reassign */

import isArray from 'es-toolkit/compat/isArray';
import isObject from 'es-toolkit/compat/isObject';
import transform from 'es-toolkit/compat/transform';

import type { TTreeNode } from '@/components/tree/types';

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
  result: TNode[] = [],
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
  rootNode: TNode,
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
  rootNode: TNode,
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
  block: ScrollLogicalPosition = 'nearest',
): void {
  if (!node || typeof document === 'undefined') return;

  const element = document.querySelector(`[data-node-id="${node.id}"]`);
  if (!element) return;

  const findScrollableAncestor = (el: Element | null): HTMLElement | null => {
    let current: HTMLElement | null = el as HTMLElement | null;
    while (current?.parentElement) {
      const parent = current.parentElement as HTMLElement;
      const style = window.getComputedStyle(parent);
      const overflowY = style.overflowY || style.overflow;
      const isScrollable = /auto|scroll/i.test(overflowY);
      if (isScrollable && parent.scrollHeight > parent.clientHeight) {
        return parent;
      }
      current = parent;
    }
    // fallback to document scrolling element
    return (document.scrollingElement || document.documentElement) as HTMLElement;
  };

  // delay to allow DOM (expansions) to settle
  window.setTimeout(() => {
    const container = findScrollableAncestor(element);
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();

    // current scroll position of the container
    const currentTop = container.scrollTop;
    const offsetTop = elementRect.top - containerRect.top + currentTop;

    let targetScrollTop = offsetTop;
    if (block === 'center') {
      targetScrollTop = offsetTop - container.clientHeight / 2 + elementRect.height / 2;
    } else if (block === 'start') {
      targetScrollTop = offsetTop;
    } else if (block === 'end') {
      targetScrollTop = offsetTop - container.clientHeight + elementRect.height;
    } else if (block === 'nearest') {
      // of already in view, do nothing; otherwise choose the closer edge
      const inView =
        elementRect.top >= containerRect.top && elementRect.bottom <= containerRect.bottom;
      if (!inView) {
        const distanceToTop = Math.abs(elementRect.top - containerRect.top);
        const distanceToBottom = Math.abs(elementRect.bottom - containerRect.bottom);
        if (distanceToTop < distanceToBottom) targetScrollTop = offsetTop;
        else targetScrollTop = offsetTop - container.clientHeight + elementRect.height;
      } else {
        return;
      }
    }

    container.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth',
    });
  }, 50);
}

/**
 * Recursively renames a specified key in an object and all of its nested objects or arrays.
 *
 * @template T - The type of the input object.
 * @param obj - The object to process. If `null`, the function returns `null`.
 * @param field - The key name to be renamed throughout the object.
 * @param newKey - The new key name to replace the old key.
 * @param keepOriginal - Whether to keep the original key alongside the new key (default: false).
 * @returns A new object with the specified key renamed at all levels, or `null` if the input is `null`.
 *
 * @example
 * ```typescript
 * const obj = { a: 1, b: { a: 2 }, c: [{ a: 3 }] };
 * const result = renameKeyDeep(obj, 'a', 'x');
 * // result: { x: 1, b: { x: 2 }, c: [{ x: 3 }] }
 *
 * const resultWithOriginal = renameKeyDeep(obj, 'a', 'x', true);
 * // result: { a: 1, x: 1, b: { a: 2, x: 2 }, c: [{ a: 3, x: 3 }] }
 * ```
 */
export function renameKeyDeep<T extends Record<string, any>>(
  obj: T | null,
  field: string,
  newKey: string,
  keepOriginal: boolean = false,
): T | null {
  if (!obj) return null;

  return transform(obj, (result, value, key) => {
    if (!result) return;

    const dic = result as Record<string, any>;

    // Process the value recursively if it's an object or array
    let processedValue: any;
    if (isArray(value)) {
      processedValue = value.map((item) => renameKeyDeep(item, field, newKey, keepOriginal));
    } else if (isObject(value)) {
      processedValue = renameKeyDeep(value, field, newKey, keepOriginal);
    } else {
      processedValue = value;
    }

    if (key === field) {
      // set the new key
      dic[newKey] = processedValue;
      // optionally keep the original key
      if (keepOriginal) {
        dic[key] = processedValue;
      }
    } else {
      // key doesn't match, set it as-is
      dic[key] = processedValue;
    }
  });
}
