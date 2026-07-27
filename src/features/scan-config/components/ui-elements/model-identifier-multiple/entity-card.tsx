'use client';

/**
 *
 * pill row showing a resolved entity name, type badge, and optional remove action
 * used in both the configure summary column and the browse overlay cart
 */

import { DeleteOutlined, SwapOutlined } from '@ant-design/icons';

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
   * - `selection`: browse overlay cart
   */
  variant?: 'summary' | 'selection';
  disabled?: boolean;
  onRemove?: () => void;
  /** when false, hide remove even if `onRemove` is provided (min-1 entity rule) */
  showRemove?: boolean;
  /**
   * swap action rendered before remove; reopens the picker to replace this
   * entity. used by `model_selector_single`, where the field holds exactly one
   */
  onChange?: () => void;
  /**
   * `data-scan-config-block-element` value; defaults to the multiple-field
   * marker. `model_selector_single` passes its own so selectors/analytics can
   * distinguish the two fields' cards.
   */
  blockElement?: string;
  className?: string;
  onSelect?: () => void;
  selected?: boolean;
};

export function ModelIdentifierEntityCard({
  entityName,
  instanceId,
  typeLabel,
  variant = 'summary',
  disabled,
  onRemove,
  showRemove = true,
  onChange,
  blockElement,
  className,
  onSelect,
  selected = false,
}: TProps) {
  const isSelection = variant === 'selection';
  // the card click only previews the entity, so it stays interactive even
  // in readonly mode. `disabled` still controls the mutating remove action below
  const isInteractive = Boolean(onSelect);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: button cannot be a descendant of button
    <div
      id={`model-identifier-entity-card-${entityName}_${instanceId}`}
      data-testid={`model-identifier-entity-card`}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={isInteractive ? onSelect : undefined}
      onKeyDown={
        isInteractive
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect?.();
              }
            }
          : undefined
      }
      className={cn(
        'grid h-auto w-full max-w-full shrink-0 min-w-0 grid-cols-[minmax(0,1fr)_auto]',
        'items-center gap-2 self-start overflow-hidden border border-gray-200 bg-white',
        isSelection ? 'rounded-full px-3 py-2.5 shadow-xs' : 'rounded-full px-4 py-2.5',
        'hover:border-gray-300 hover:shadow-xs hover:bg-gray-50',
        // motion: fade+rise on mount, ease state changes (hover/selected), press feedback.
        // transitions (not keyframes) so a card added mid-flight retargets smoothly.
        'transition-[opacity,transform,background-color,border-color,box-shadow] duration-150 ease-[var(--ease-out-expo)]',
        'starting:opacity-0 starting:-translate-y-1 motion-reduce:starting:translate-y-0',
        {
          'cursor-pointer active:scale-[0.98] motion-reduce:active:scale-100': isInteractive,
          'border-primary-8 bg-primary-1/30 ring-1 ring-primary-8/20': selected,
        },
        className
      )}
      data-scan-config-block-element={
        blockElement ?? `${ScanConfigUIElementDict.ModelIdentifierMultiple}-${variant}`
      }
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
        {!disabled && onChange ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onChange();
            }}
            className="inline-flex size-6 shrink-0 items-center justify-center text-primary-9 transition-colors hover:text-primary-8 hover:bg-white rounded-full"
            aria-label={`Change ${entityName}`}
          >
            <SwapOutlined className="text-xs!" />
          </button>
        ) : null}
        {showRemove && !disabled && onRemove ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRemove();
            }}
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
