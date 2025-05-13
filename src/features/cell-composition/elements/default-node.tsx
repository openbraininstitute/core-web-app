import React, { type CSSProperties } from 'react';
import { CaretRightFilled } from '@ant-design/icons';

import { classNames } from '@/util/utils';

import type { TTreeNode, RenderNodeProps } from '@/components/tree/types';

export type Props<TNode extends TTreeNode = TTreeNode> = RenderNodeProps<TNode>;

export default function DefaultNode<TNode extends TTreeNode>({
  node,
  isExpanded,
  isSelected,
  hasChildren,
  onToggle,
  onClick,
  defaultColor,
  subtitle,
  indentation,
}: Props<TNode>) {
  const color = 'color' in node ? node.color : defaultColor;
  const nodeName = node.name;

  return (
    <div
      id={node.id.toString()}
      title={nodeName}
      aria-label={nodeName}
      className={classNames(
        'flex min-w-0 flex-1 cursor-default items-center transition-colors duration-200 ease-in-out',
        'hover:text-primary-1 px-2 py-1 text-white hover:font-bold',
        hasChildren ? (isExpanded ? 'my-0' : 'my-1.5') : 'mb-2'
      )}
      onClick={onClick}
    >
      <div className="flex w-full flex-col">
        <div className="flex w-full items-center justify-between gap-1.5 text-base">
          <span className="font-bold">{nodeName}</span>
          <div className="flex items-center justify-center">
            {subtitle?.({ node, props: { hasChildren } })}
            {hasChildren && (
              <button
                className={classNames(
                  'ml-auto flex flex-shrink-0 items-center justify-center',
                  isSelected ? 'text-primary-8' : 'text-[var(--color)]'
                )}
                onClick={onToggle}
                style={{ '--color': `#${color}` } as CSSProperties}
              >
                <CaretRightFilled
                  size={14}
                  className={classNames(
                    'text-base text-current transition-transform duration-300 ease-in-out',
                    isExpanded ? 'rotate-90' : ''
                  )}
                />
              </button>
            )}
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div
            className="mt-2 font-light! text-gray-400"
            style={{ marginLeft: indentation?.size || 18 }}
          >
            E-Types
          </div>
        )}
      </div>
    </div>
  );
}
