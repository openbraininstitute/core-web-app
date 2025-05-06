import React, { memo } from 'react';
import DefaultNode from '@/features/brain-region-tree/latest/elements/default-node';
import { VerticalIndentationLine, HorizontalIndentationLine } from '@/features/brain-region-tree/latest/elements/indentation';
import { classNames } from '@/util/utils';
import type {
  GenericNode,
  RenderNodeProps,
  NodeSubtitleConfig,
  NodeIndentationConfig,
} from '@/features/brain-region-tree/latest/com';

interface NodeProps<TNode extends GenericNode> {
  dataKey: string;
  node: TNode;
  level: number;
  isLast: boolean;
  nodeRowHeight?: number;
  renderNode?: (props: RenderNodeProps<TNode>) => React.ReactNode;
  expandedIds: Set<string>;
  selectedNode: TNode | null;
  onToggle: (node: TNode) => void;
  onClick: (node: TNode) => void;
  subtitle?: NodeSubtitleConfig;
  indentation?: NodeIndentationConfig;
}

const Node = <TNode extends GenericNode>({
  dataKey,
  node,
  level,
  isLast,
  renderNode: customNodeRender,
  expandedIds,
  selectedNode,
  onToggle,
  onClick,
  subtitle,
  nodeRowHeight,
  indentation,
}: NodeProps<TNode>) => {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedNode?.id === node.id;
  const hasChildren = Boolean(node.children && node.children.length > 0);

  const NodeContent = customNodeRender || DefaultNode;

  const handleToggle = () => {
    onToggle(node);
  };

  const handleClick = () => {
    onClick(node);
  };

  return (
    <div
      className={classNames('group/node flex flex-col')}
      role="treeitem"
      aria-level={level + 1}
      aria-expanded={isExpanded}
      aria-selected={isSelected}
      data-node-id={node.id}
    >
      <div
        className={classNames('flex items-center')}
        style={{ height: nodeRowHeight || 32 }}
      >
        <VerticalIndentationLine
          left={level * (indentation?.size || 18)}
          top={0}
          height="100%"
          lineStyle={indentation?.style || 'border-dotted border-primary-6'}
        />
        <HorizontalIndentationLine
          left={level * (indentation?.size || 18)}
          top={0}
          width="100%"
          lineStyle={indentation?.style || 'border-dotted border-primary-6'}
        />
        <NodeContent
          node={node}
          onToggle={handleToggle}
          onClick={handleClick}
          isExpanded={isExpanded}
          isSelected={isSelected}
          hasChildren={hasChildren}
          level={level}
          isLast={isLast}
          dataKey={dataKey}
          subtitle={subtitle}
          indentation={indentation}
          nodeRowHeight={nodeRowHeight}
        />
      </div>
      {isExpanded && hasChildren && (
        <div
          className="relative"
          style={{
            display: isExpanded ? 'block' : 'none', // Control visibility to prevent layout shift
          }}
        >
          {/* Vertical line from THIS PARENT (current node) extending alongside its children */}
          {/* This line starts from the parent's vertical center and goes down. */}
          {indentation?.v && (
            <div
              className={`absolute border-l ${indentation.style}`}
              style={{
                left: `${level * (indentation?.size || 18) + (indentation?.size || 18) / 2 - 1}px`, // Positioned at the current node's own line level
                top: 0, // Start from the top of the children container
                height: `100%`, // Extends full height of the children container
              }}
            />
          )}
          {node.children?.map((childNode, index, arr) => (
            <MemoizedNode
              key={childNode.id}
              dataKey={dataKey}
              node={childNode as TNode}
              level={level + 1}
              isLast={index === arr.length - 1}
              renderNode={customNodeRender}
              expandedIds={expandedIds}
              selectedNode={selectedNode}
              onToggle={onToggle}
              onClick={onClick}
              subtitle={subtitle}
              nodeRowHeight={nodeRowHeight}
              indentation={indentation}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const MemoizedNode = memo(Node) as typeof Node;

Node.displayName = 'Node';
MemoizedNode.displayName = 'MemoizedNode';

export default MemoizedNode;
