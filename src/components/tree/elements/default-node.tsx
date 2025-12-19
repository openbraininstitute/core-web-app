'use client';

import { CaretRightFilled } from '@ant-design/icons';
import type { CSSProperties } from 'react';
import type { RenderNodeProps, TTreeNode } from '@/components/tree/types';
import { classNames } from '@/util/utils';

type Props<TNode extends TTreeNode = TTreeNode> = RenderNodeProps<TNode>;

export default function DefaultNode<TNode extends TTreeNode>({
  node,
  isExpanded,
  isSelected,
  hasChildren,
  onToggle,
  onClick,
  defaultColor,
}: Props<TNode>) {
  const color = 'color' in node ? node.color : defaultColor;
  const nodeName = node.name;

  return (
    <div
      id={node.id.toString()}
      title={nodeName}
      aria-label={nodeName}
      role="button"
      tabIndex={0}
      className={classNames(
        'flex min-w-0 flex-1 cursor-pointer items-center transition-colors duration-200 ease-in-out',
        'text-primary-9 hover:text-primary-8 hover:bg-primary-highlight/40 my-1.5 h-[var(--height)] px-2 py-2 hover:font-bold',
        isSelected
          ? 'text-primary-8 bg-primary-highlight rounded-full font-bold'
          : 'transparent rounded-md font-medium',
      )}
      onClick={onClick}
      onKeyDown={(evt) => {
        if (evt.key === ' ') onClick();
      }}
      style={
        {
          '--color': `#${color}`,
        } as CSSProperties
      }
    >
      <div className="mr-1.5 flex min-w-0 flex-shrink flex-grow basis-0 items-center">
        <div className="flex items-baseline">
          <span className={classNames('text-base', isSelected ? 'line-clamp-1' : '')}>
            {nodeName}
          </span>
        </div>
      </div>
      {hasChildren && (
        <button
          className={classNames(
            'ml-auto flex flex-shrink-0 items-center justify-center',
            isSelected ? 'text-primary-9' : 'text-primary-9/60',
          )}
          type="button"
          onClick={onToggle}
          style={{ '--color': `#${color}` } as CSSProperties}
        >
          <CaretRightFilled
            size={14}
            className={classNames(
              'text-base text-current transition-transform duration-300 ease-in-out',
              isExpanded ? 'rotate-90' : '',
            )}
          />
        </button>
      )}
    </div>
  );
}
