import flatMap from 'es-toolkit/compat/flatMap';
import map from 'es-toolkit/compat/map';
import React, { type ReactNode, useCallback, useEffect, useState } from 'react';

import { getParentsToRoot, scrollToNode } from '@/components/tree/elements/helpers';
import { MemoizedNode as Node } from '@/components/tree/elements/node';
import type {
  NodeIndentation,
  NodeSubtitle,
  RenderNodeProps,
  TTreeNode,
} from '@/components/tree/types';
import { classNames } from '@/util/utils';

interface Props<TNode extends TTreeNode> {
  dataKey: string;
  data: TNode | TNode[];
  height?: string | number;
  onClick?: (node: TNode) => void;
  onToggle?: (node: TNode, expanded: boolean) => void;
  defaultExpandedNodes?: Array<string | number>;
  // @FIXME: is this prop used?
  // eslint-disable-next-line react/no-unused-prop-types
  subtitle?: NodeSubtitle<TNode>;
  className?: string;
  indentation?: NodeIndentation;
  nodeRowHeight?: number;
  renderNode?: (props: RenderNodeProps<TNode>) => ReactNode;
  defaultColor?: string;
  selectedNode: TNode | null;
  separator?: boolean;
  keepPreviousExpanded?: boolean;
}

function Container({
  children,
  height,
  className,
}: {
  children: ReactNode;
  height?: string | number;
  className?: string;
}) {
  return (
    <div
      className={classNames('no-scrollbar h-full min-h-0 w-full overflow-y-auto', className)}
      style={{ height }}
    >
      {children}
    </div>
  );
}

export default function Tree<TNode extends TTreeNode>({
  dataKey,
  data,
  onClick,
  onToggle,
  className,
  indentation = {
    h: false,
    v: true,
    size: 18,
    style: 'border-dotted border-primary-6',
  },
  defaultExpandedNodes = [],
  height = 'auto',
  nodeRowHeight = 32,
  renderNode,
  defaultColor,
  selectedNode,
  separator = true,
  keepPreviousExpanded = false,
}: Props<TNode>) {
  const nodes = React.useMemo(() => (Array.isArray(data) ? data : [data]), [data]);

  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(
      flatMap(defaultExpandedNodes, (id) =>
        flatMap(nodes, (node) => map(getParentsToRoot(id.toString(), node as any), 'id'))
      )
    )
  );

  useEffect(() => {
    if (selectedNode) {
      setExpandedIds((prev) => {
        // get parents path to the selected node across all trees
        const currentParents = flatMap(nodes, (node) =>
          flatMap(getParentsToRoot(selectedNode.id, node as any), 'id')
        );

        // get parents for default expanded nodes
        const initialParents = flatMap(defaultExpandedNodes, (id) =>
          flatMap(nodes, (node) => map(getParentsToRoot(id.toString(), node as any), 'id'))
        );

        let finalExpandedNodes: Array<string>;

        if (keepPreviousExpanded) {
          // keep all previous expanded nodes and add path to selected node
          finalExpandedNodes = [
            ...Array.from(prev),
            ...currentParents,
            ...defaultExpandedNodes.map(String),
            ...initialParents,
          ];
        } else {
          // only expand path to selected node + default expanded nodes (collapse everything else)
          finalExpandedNodes = [
            ...currentParents,
            ...defaultExpandedNodes.map(String),
            ...initialParents,
          ];
        }

        return new Set(finalExpandedNodes);
      });

      requestAnimationFrame(() => {
        scrollToNode(selectedNode as any, 'start');
      });
    }
  }, [selectedNode, defaultExpandedNodes, keepPreviousExpanded, nodes]);

  const handleToggle = useCallback(
    (node: TNode) => {
      setExpandedIds((prev) => {
        const newSet = new Set(prev);
        const isNowExpanded = newSet.has(node.id);
        if (isNowExpanded) newSet.delete(node.id);
        else newSet.add(node.id);
        onToggle?.(node, !isNowExpanded);
        return newSet;
      });
    },
    [onToggle]
  );

  const handleClick = useCallback(
    (node: TNode) => {
      onClick?.(node);
    },
    [onClick]
  );

  return (
    <Container {...{ height, className }}>
      {nodes.map((node, index, array) => (
        <Node
          key={node.id}
          dataKey={dataKey}
          node={node}
          level={0}
          isLast={index === array.length - 1}
          renderNode={renderNode as any}
          expandedIds={expandedIds}
          selectedNode={selectedNode as unknown as TNode}
          onToggle={handleToggle}
          onClick={handleClick}
          nodeRowHeight={nodeRowHeight}
          indentation={indentation}
          defaultColor={defaultColor}
          separator={separator}
        />
      ))}
    </Container>
  );
}
