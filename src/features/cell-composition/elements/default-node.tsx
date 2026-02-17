import { CaretRightFilled } from '@ant-design/icons';

import { classNames } from '@/util/utils';
import { cn } from '@/utils/css-class';

import type { RenderNodeProps, TTreeNode } from '@/components/tree/types';

type Props<TNode extends TTreeNode = TTreeNode> = RenderNodeProps<TNode>;

export default function DefaultNode<TNode extends TTreeNode>({
  node,
  isExpanded,
  isSelected,
  hasChildren,
  onToggle,
  onClick,
  subtitle,
  indentation,
  title,
}: Props<TNode> & {
  title?: string | undefined;
}) {
  const nodeName = node.name;

  return (
    <div
      id={node.id.toString()}
      title={title}
      aria-label={nodeName}
      role="button"
      tabIndex={0}
      className={cn(
        'flex min-w-0 flex-1 cursor-default items-center transition-colors duration-200 ease-in-out',
        'hover:text-primary-1 px-2 py-1 text-white hover:font-bold',
        figureOutMargin(hasChildren, isExpanded)
      )}
      onClick={onClick}
      onKeyDown={(evt) => {
        if (evt.key === ' ') onClick();
      }}
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
                type="button"
              >
                <CaretRightFilled
                  size={14}
                  className={classNames(
                    'text-base text-gray-300 transition-transform duration-300 ease-in-out',
                    isExpanded ? 'rotate-90' : ''
                  )}
                />
              </button>
            )}
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div
            className="text-primary-3 mt-2 text-sm font-light! uppercase"
            style={{ marginLeft: indentation?.size || 18 }}
          >
            E-Types
          </div>
        )}
      </div>
    </div>
  );
}

function figureOutMargin(
  hasChildren: boolean,
  isExpanded: boolean
): string | boolean | null | undefined {
  if (!hasChildren) return 'mb-2';
  return isExpanded ? 'my-0' : 'my-1.5';
}
