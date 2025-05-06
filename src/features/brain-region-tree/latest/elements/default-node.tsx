import React from 'react';
import { CaretRightFilled, CaretDownOutlined } from '@ant-design/icons'; // Or your icon source

import { classNames } from '@/util/utils';
// Import GenericNode and RenderNodeProps
import type { GenericNode, RenderNodeProps as GenericRenderNodeProps } from '@/features/brain-region-tree/latest/com';

// Define Props for DefaultNode using the generic RenderNodeProps from com.tsx
// We are essentially saying DefaultNodeProps is a specific usage of RenderNodeProps
export type Props<TNode extends GenericNode = GenericNode> = GenericRenderNodeProps<TNode>;

// Make DefaultNode generic and use the new Props type
export default function DefaultNode<TNode extends GenericNode>({
  node,
  isExpanded,
  isSelected,
  hasChildren,
  onToggle, // Directly use onToggle from RenderNodeProps
  onClick,  // Directly use onClick from RenderNodeProps
  subtitle,
  // dataKey, level, isLast, indentation, nodeRowHeight are available from Props if needed for styling/logic
}: Props<TNode>) {
  const Icon = isExpanded ? CaretDownOutlined : CaretRightFilled;

  // Extract color from node if it exists, assuming it might be part of TNode
  const color = (node as any).color_hex_triplet;
  const nodeName = (node as any).name || node.id; // Fallback to id if name is not present

  return (
    <div
      className={classNames(
        'flex min-w-0 flex-1 cursor-pointer items-center transition-colors duration-200 ease-in-out',
        'text-primary-1 hover:text-primary-1 h-full px-1 py-0.5 hover:bg-primary-3/20 hover:font-semibold',
        isSelected ? 'text-primary-8 rounded-md bg-primary-3 font-semibold' : 'rounded-md font-medium'
      )}
      onClick={onClick} // Use the passed onClick handler
      style={color ? { '--node-color': `#${color}` } as React.CSSProperties : {}}
      title={nodeName}
    >
      {hasChildren && (
        <Icon
          className={classNames(
            'mr-1 h-4 w-4 flex-shrink-0 text-gray-500 group-hover/node:text-primary-1 transition-colors duration-150',
            isSelected && 'text-primary-8'
          )}
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation(); // Prevent onClick on the main div from firing
            onToggle(); // Use the passed onToggle handler
          }}
          aria-hidden="true"
        />
      )}
      {!hasChildren && <span className="mr-1 h-4 w-4 flex-shrink-0" />} {/* Placeholder for alignment */}
      <span className="truncate text-sm" id={`node-label-${node.id}`}>
        {nodeName}
      </span>
      {subtitle && subtitle.position === 'right' && (
        <span className="ml-2 truncate text-xs text-gray-500">
          {subtitle.text}
        </span>
      )}
    </div>
  );
}
