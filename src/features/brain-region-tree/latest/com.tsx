import React, { useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { AtomFamily } from 'jotai/vanilla/utils/atomFamily';
import { atom, PrimitiveAtom } from 'jotai';
import { atomFamily } from 'jotai/utils';
import flatMap from 'lodash/flatMap';
import map from 'lodash/map';

import Node from '@/features/brain-region-tree/latest/elements/node';

import {
  getParentsToRoot,
  scrollToNode,
} from '@/features/brain-region-tree/latest/elements/helpers';
import { classNames } from '@/util/utils';

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';

export const selectedBrainRegionAtom: AtomFamily<
  string,
  PrimitiveAtom<IBrainRegionHierarchy | null>
> = atomFamily(() => atom<IBrainRegionHierarchy | null>(null));

export interface GenericNode {
  id: string;
  children?: GenericNode[];
}

export interface NodeSubtitleConfig {
  text: string;
  position: 'bottom' | 'right';
}

export interface NodeIndentationConfig {
  h?: boolean;
  v?: boolean;
  size?: number;
  style?: string;
}

export interface RenderNodeProps<TNode extends GenericNode> {
  node: TNode;
  onToggle: () => void;
  onClick: () => void;
  isExpanded: boolean;
  isSelected: boolean;
  hasChildren: boolean;
  level: number;
  isLast: boolean;
  dataKey: string;
  subtitle?: NodeSubtitleConfig;
  indentation?: NodeIndentationConfig;
  nodeRowHeight?: number;
}

export interface BrainTreeProps<TNode extends GenericNode> {
  dataKey: string;
  data: TNode;
  height?: string | number;
  onNodeClick?: (node: TNode) => void;
  onNodeToggle?: (node: TNode, expanded: boolean) => void;
  defaultExpandedNodes?: Array<string | number>;
  subtitle?: NodeSubtitleConfig;
  className?: string;
  indentation?: NodeIndentationConfig;
  nodeRowHeight?: number;
  renderNode?: (props: RenderNodeProps<TNode>) => ReactNode;
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

export default function BrainRegionTree<TNode extends GenericNode>({
  dataKey,
  data,
  onNodeClick,
  onNodeToggle,
  subtitle,
  className,
  indentation = {
    h: false,
    v: true,
    size: 18,
    style: 'border-dotted border-primary-6',
  },
  defaultExpandedNodes: initialExpandedIds = [],
  height = 'auto',
  nodeRowHeight = 32,
  renderNode,
}: BrainTreeProps<TNode>) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set(flatMap(initialExpandedIds, (id) => map(getParentsToRoot(id.toString(), data as any), 'id')))
  );
  const [selectedNode, setSelectedNode] = useState<TNode | null>(null);

  useEffect(() => {
    if (selectedNode) {
      setExpandedIds((prev) => {
        const currentParents = flatMap(getParentsToRoot(selectedNode.id, data as any), 'id');
        const list = [
          ...prev,
          ...currentParents,
        ];
        const initialParents = flatMap(initialExpandedIds, (id) => map(getParentsToRoot(id.toString(), data as any), 'id'));
        list.push(...initialExpandedIds, ...initialParents);

        return new Set(list);
      });
      scrollToNode(selectedNode as any);
    }
  }, [selectedNode, data, initialExpandedIds]);

  const onToggle = useCallback(
    (node: TNode) => {
      setExpandedIds((prev) => {
        const newSet = new Set(prev);
        const isNowExpanded = newSet.has(node.id);
        if (isNowExpanded) newSet.delete(node.id);
        else newSet.add(node.id);
        if (onNodeToggle) onNodeToggle(node, !isNowExpanded);
        return newSet;
      });
    },
    [onNodeToggle]
  );

  const onClick = useCallback(
    (node: TNode) => {
      setSelectedNode(node);
      onNodeClick?.(node);
    },
    [onNodeClick, setSelectedNode]
  );

  return (
    <Container {...{ height, className }}>
      <Node
        dataKey={dataKey}
        node={data}
        level={0}
        isLast={true}
        renderNode={renderNode as any}
        expandedIds={expandedIds}
        selectedNode={selectedNode}
        onToggle={onToggle}
        onClick={onClick}
        subtitle={subtitle}
        nodeRowHeight={nodeRowHeight}
        indentation={indentation}
      />
    </Container>
  );
}
