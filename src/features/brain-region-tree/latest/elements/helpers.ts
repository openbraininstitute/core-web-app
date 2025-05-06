import type { GenericNode } from '@/features/brain-region-tree/latest/com';

/**
 * Recursively flattens a tree structure into a flat list of nodes.
 * Each node in the list will have a `parentId` property, except for the root node.
 */
export function flattenTree<TNode extends GenericNode>(
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
 * Finds a node by its ID in a tree structure.
 */
export function findNodeByKey<TNode extends GenericNode>(key: string, id: string, rootNode: TNode): TNode | null {
  if (rootNode[key as keyof TNode]?.toString() === id) {
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
 * Gets all parent nodes from a given node up to the root.
 * The target ID is now a string.
 */
export function getParentsToRoot<TNode extends GenericNode>(
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
 * Scrolls to a specific node in the tree view if it's rendered.
 * Assumes nodes have a `data-node-id` attribute set to their ID.
 */
export function scrollToNode<TNode extends GenericNode>(node: TNode | null): void {
  if (!node || typeof document === 'undefined') return;

  const element = document.querySelector(`[node-id="${node.id}"]`);
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }
}

/**
 * Searches for nodes in the tree whose names match the query text (case-insensitive).
 * Returns a list of matching node IDs.
 * Assumes TNode might have an optional 'name' property.
 */
export function searchNodes<TNode extends GenericNode & { name?: string }>(
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
