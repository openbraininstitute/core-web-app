'use client';

/**
 * @module entity-card
 *
 * pill row showing a resolved entity name, type badge, and optional remove action
 * used in both the configure summary column and the browse overlay cart
 */

import { DeleteOutlined } from '@ant-design/icons';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { cn } from '@/utils/css-class';

type TProps = {
  /** display name from entity core (`entity.name`) */
  entityName: string;
  instanceId: string;
  /** uppercase badge label (domain title or FromID-derived label) */
  typeLabel: string;
  /**
   * visual variant:
   * - `summary`: middle-column configure view (default)
   * - `selection`: browse overlay cart (slightly muted badge)
   */
  variant?: 'summary' | 'selection';
  disabled?: boolean;
  onRemove?: () => void;
  /** when false, hide remove even if `onRemove` is provided (min-1 entity rule) */
  showRemove?: boolean;
  className?: string;
};

export function ModelIdentifierEntityCard({
  entityName,
  instanceId,
  typeLabel,
  variant = 'summary',
  disabled,
  onRemove,
  showRemove = true,
  className,
}: TProps) {
  const isSelection = variant === 'selection';

  return (
    <div
      id={`model-identifier-entity-card-${entityName}_${instanceId}`}
      data-testid={`model-identifier-entity-card`}
      className={cn(
        'grid h-auto w-full max-w-full shrink-0 min-w-0 grid-cols-[minmax(0,1fr)_auto]',
        'items-center gap-2 self-start overflow-hidden border border-gray-200 bg-white',
        isSelection ? 'rounded-full px-3 py-2.5 shadow-xs' : 'rounded-full px-4 py-2.5',
        'hover:border-gray-300 hover:shadow-xs hover:bg-gray-50',
        className
      )}
      data-scan-config-block-element={`${ScanConfigUIElementDict.ModelIdentifierMultiple}-${variant}`}
    >
      <span className="min-w-0 truncate text-sm font-semibold text-primary-9">{entityName}</span>
      <div className="flex max-w-full min-w-0 items-center justify-end gap-2">
        <span
          className={cn(
            'rounded-full border border-neutral-2 bg-white px-2.5 py-0.5 text-xs font-semibold tracking-wide uppercase',
            {
              'text-gray-400': isSelection,
              'text-gray-500': !isSelection,
            }
          )}
        >
          {typeLabel}
        </span>
        {showRemove && !disabled && onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex size-6 shrink-0 items-center justify-center text-red-500 transition-colors hover:text-red-600 hover:bg-white rounded-full"
            aria-label={`Remove ${entityName}`}
          >
            <DeleteOutlined className="text-xs!" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
