'use client';

import { CaretRightFilled } from '@ant-design/icons';
import type { CSSProperties } from 'react';
import type { RenderNodeProps } from '@/components/tree/types';

import type { IBrainRegionHierarchyExtended } from '@/features/brain-region-hierarchy/context';
import { cn } from '@/utils/css-class';

type Props<TNode extends IBrainRegionHierarchyExtended = IBrainRegionHierarchyExtended> =
  RenderNodeProps<TNode>;

export function BrainRegionHierarchyNodeRender<TNode extends IBrainRegionHierarchyExtended>({
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
      className={cn(
        'flex min-w-0 flex-1 cursor-pointer items-center transition-colors duration-200 ease-in-out',
        'text-primary-9 hover:text-primary-8 hover:bg-primary-highlight/40 my-1.5 h-[var(--height)] px-2 py-2 hover:font-bold',
        {
          'text-primary-8 bg-primary-highlight rounded-full font-bold': isSelected,
        },
        { 'transparent rounded-md font-medium': !isSelected },
        {
          'text-gray-500 hover:bg-zinc-200 hover:text-gray-500': !node.is_volumetric_region,
        },
        {
          'bg-zinc-200! text-gray-500': !node.is_volumetric_region && isSelected,
        },
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
          <span className={cn('text-base', { 'line-clamp-1': isSelected })}>{nodeName}</span>
        </div>
      </div>
      {hasChildren && (
        <button
          className={cn(
            'ml-auto flex flex-shrink-0 items-center justify-center',
            'rounded-full p-0.5 hover:bg-black/10 hover:shadow-md',
            { 'text-primary-9': isSelected },
            { 'text-primary-9/60': !isSelected },
          )}
          type="button"
          onClick={onToggle}
          style={{ '--color': `#${color}` } as CSSProperties}
        >
          <CaretRightFilled
            size={14}
            className={cn('text-base text-current transition-transform duration-300 ease-in-out', {
              'rotate-90': isExpanded,
            })}
          />
        </button>
      )}
    </div>
  );
}
