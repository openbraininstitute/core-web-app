import type React from 'react';
import { type CSSProperties, memo } from 'react';

import DefaultNode from '@/components/tree/elements/default-node';
import {
  HorizontalIndentationLine,
  VerticalIndentationLine,
} from '@/components/tree/elements/indentation';
import type { NodeIndentation, RenderNodeProps, TTreeNode } from '@/components/tree/types';
import { classNames } from '@/util/utils';

interface NodeProps<TNode extends TTreeNode> {
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
  indentation?: NodeIndentation;
  defaultColor?: string;
  separator?: boolean;
}

function Node<TNode extends TTreeNode>({
  dataKey,
  node,
  level,
  isLast,
  renderNode: customNodeRender,
  expandedIds,
  selectedNode,
  onToggle,
  onClick,
  nodeRowHeight,
  indentation,
  defaultColor,
  separator = true,
}: NodeProps<TNode>) {
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedNode?.id === node.id;
  const hasChildren = Boolean(node.children && node.children.length > 0);

  const NodeContent = customNodeRender || DefaultNode;

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.preventDefault();
    e.stopPropagation();
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
      <div className="relative w-full">
        {indentation?.v && level > 0 && (
          <VerticalIndentationLine
            left={(level - 1) * (indentation?.size || 18) + (indentation?.size || 18) / 2 - 1}
            top={0}
            height={nodeRowHeight ? nodeRowHeight / 2 : 0}
            lineStyle={indentation?.style || 'border-dashed border-neutral-2!'}
          />
        )}
        <div
          className="relative flex min-h-[var(--min-height)] w-full items-center pl-[var(--padding-left)]"
          style={
            {
              '--min-height': `${nodeRowHeight}px`,
              '--padding-left': `${level * (indentation?.size || 18)}px`,
            } as CSSProperties
          }
        >
          {indentation?.h && level > 0 && (
            <HorizontalIndentationLine
              left={(level - 1) * (indentation?.size || 18) + (indentation?.size || 18) / 2 - 1}
              top={nodeRowHeight ? nodeRowHeight / 2 - 1 : 0}
              width={indentation?.size || 18 / 2 + 1}
              lineStyle={indentation?.style || 'border-dashed border-neutral-2!'}
            />
          )}
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
            indentation={indentation}
            nodeRowHeight={nodeRowHeight}
            defaultColor={defaultColor}
          />
          {!isLast && !isExpanded && separator && (
            <div
              className={classNames(
                `border-b-neutral-2 absolute border-b`,
                'right-1.5 bottom-0 left-[var(--left)] h-px w-[var(--width)]',
              )}
              style={
                {
                  //   '--left': `${level * (indentation?.size || 18)}px`,
                  '--width': `calc(100% - ${level * (indentation?.size || 18)}px - 10px)`,
                } as CSSProperties
              }
            />
          )}
        </div>
      </div>
      {isExpanded && hasChildren && (
        <div
          className={classNames(
            'relative block overflow-hidden transition-all duration-300 ease-in-out',
            'animate-[fade-in_0.3s_ease-in-out]',
          )}
        >
          {indentation?.v && (
            <VerticalIndentationLine
              left={level * (indentation?.size || 18) + (indentation?.size || 18) / 2 - 1}
              top={0}
              height="100%"
              lineStyle={indentation?.style || 'border-dashed border-neutral-2'}
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
              nodeRowHeight={nodeRowHeight}
              indentation={indentation}
              defaultColor={defaultColor}
              separator={separator}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export const MemoizedNode = memo(Node) as typeof Node;

export default MemoizedNode;
