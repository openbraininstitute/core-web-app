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

export interface Props<TNode extends TTreeNode> {
  dataKey: string;
  data: TNode;
  height?: string | number;
  onClick?: (node: TNode) => void;
  onToggle?: (node: TNode, expanded: boolean) => void;
  defaultExpandedNodes?: Array<string | number>;
  subtitle?: NodeSubtitle;
  className?: string;
  indentation?: NodeIndentation;
  nodeRowHeight?: number;
  renderNode?: (props: RenderNodeProps<TNode>) => ReactNode;
  defaultColor?: string;
  selectedNode: TNode | null;
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
  subtitle,
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
}: Props<TNode>) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(
      flatMap(defaultExpandedNodes, (id) => map(getParentsToRoot(id.toString(), data as any), 'id'))
    )
  );

  useEffect(() => {
    if (selectedNode) {
      setExpandedIds((prev) => {
        const currentParents = flatMap(getParentsToRoot(selectedNode.id, data as any), 'id');
        const list = [...prev, ...currentParents];
        const initialParents = flatMap(defaultExpandedNodes, (id) =>
          map(getParentsToRoot(id.toString(), data as any), 'id')
        );
        list.push(...defaultExpandedNodes, ...initialParents);

        return new Set(list);
      });
      scrollToNode(selectedNode as any, 'start');
    }
  }, [selectedNode, data, defaultExpandedNodes]);

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
      <Node
        dataKey={dataKey}
        node={data}
        level={0}
        isLast
        renderNode={renderNode as any}
        expandedIds={expandedIds}
        selectedNode={selectedNode as unknown as TNode}
        onToggle={handleToggle}
        onClick={handleClick}
        subtitle={subtitle}
        nodeRowHeight={nodeRowHeight}
        indentation={indentation}
        defaultColor={defaultColor}
      />
    </Container>
  );
}
