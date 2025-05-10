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
  subtitle,
  defaultColor,
}: Props<TNode>) {
  const color = 'color' in node ? node.color : defaultColor;
  const nodeName = node.name;

  return (
    <div
      id={node.id.toString()}
      title={nodeName}
      aria-label={nodeName}
      className={classNames(
        'flex min-w-0 flex-1 cursor-pointer items-center transition-colors duration-200 ease-in-out',
        'text-primary-1 hover:text-primary-1 my-1.5 h-[var(--height)] px-2 py-2 hover:bg-[var(--color)]/20 hover:font-bold',
        isSelected
          ? 'text-primary-8 rounded-full bg-[var(--color)] font-bold'
          : 'transparent rounded-md font-medium'
      )}
      onClick={onClick}
      style={
        {
          '--color': `#${color}`,
        } as CSSProperties
      }
    >
      <div className="mr-1.5 flex min-w-0 flex-shrink flex-grow basis-0 items-center">
        {subtitle?.position === 'bottom' ? (
          <div className="flex flex-col">
            <span className={classNames('text-base', isSelected ? 'line-clamp-1' : '')}>
              {nodeName}
            </span>
            {subtitle?.text && <span className="text-primary-1 text-xs">{subtitle.text}</span>}
          </div>
        ) : (
          <div className="flex items-baseline">
            <span className={classNames('text-base', isSelected ? 'line-clamp-1' : '')}>
              {nodeName}
            </span>
            {subtitle && <span className="text-primary-1 ml-2 text-xs">({subtitle.text})</span>}
          </div>
        )}
      </div>
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
            className={classNames('text-base text-current', isExpanded ? 'rotate-90' : '')}
          />
        </button>
      )}
    </div>
  );
}
