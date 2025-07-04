import React, { useState, useCallback, useEffect, ReactNode } from 'react';
import flatMap from 'lodash/flatMap';
import map from 'lodash/map';

import Node from '@/components/tree/elements/node';
import { getParentsToRoot, scrollToNode } from '@/components/tree/elements/helpers';
import { classNames } from '@/util/utils';

import type {
  RenderNodeProps,
  NodeIndentation,
  NodeSubtitle,
  TTreeNode,
} from '@/components/tree/types';

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
      className={classNames('no-scrollbar w-full overflow-y-auto', className)}
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
        const currentParents = flatMap(nodes, (node) =>
          flatMap(getParentsToRoot(selectedNode.id, node as any), 'id')
        );
        const list = [...prev, ...currentParents];
        const initialParents = flatMap(defaultExpandedNodes, (id) =>
          flatMap(nodes, (node) => map(getParentsToRoot(id.toString(), node as any), 'id'))
        );
        list.push(...defaultExpandedNodes, ...initialParents);

        return new Set(list);
      });
      scrollToNode(selectedNode as any, 'start');
    }
  }, [selectedNode, data, defaultExpandedNodes, nodes]);

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
