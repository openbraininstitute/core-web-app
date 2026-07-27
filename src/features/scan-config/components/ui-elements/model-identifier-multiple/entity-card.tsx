'use client';

/**
 *
 * pill row showing a resolved entity name, type badge, and optional remove action
 * used in both the configure summary column and the browse overlay cart
 */

import { DeleteOutlined, SwapOutlined, TagsOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';

import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { cn } from '@/utils/css-class';

/** collapse the type badge to an icon once its full label would exceed this share of the card */
const BADGE_CROWD_RATIO = 0.4;

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
   * when the type badge is long enough to crowd the name (e.g. "EXTRACELLULAR
   * RECORDING ARRAY (BETA)"), collapse it to a small icon so the entity name
   * stays readable; hovering the icon expands it to the full label (and hides
   * the name). used by `model_selector_single`.
   */
  collapsibleBadge?: boolean;
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
  collapsibleBadge = false,
  blockElement,
  className,
  onSelect,
  selected = false,
}: TProps) {
  const isSelection = variant === 'selection';
  // the card click only previews the entity, so it stays interactive even
  // in readonly mode. `disabled` still controls the mutating remove action below
  const isInteractive = Boolean(onSelect);

  // decide whether the badge crowds the name by comparing the badge's full
  // (always-rendered, layout-preserving) label width to the card width. the
  // measured span keeps its dimensions when collapsed (opacity, not display),
  // so this never feeds back into its own trigger.
  const cardRef = useRef<HTMLDivElement>(null);
  const badgeLabelRef = useRef<HTMLSpanElement>(null);
  const [badgeCrowdsName, setBadgeCrowdsName] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-measure when the label changes
  useEffect(() => {
    if (!collapsibleBadge) {
      setBadgeCrowdsName(false);
      return undefined;
    }
    const measure = () => {
      const card = cardRef.current;
      const label = badgeLabelRef.current;
      if (card && label) {
        setBadgeCrowdsName(label.scrollWidth > card.clientWidth * BADGE_CROWD_RATIO);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (cardRef.current) {
      observer.observe(cardRef.current);
    }
    return () => observer.disconnect();
  }, [collapsibleBadge, typeLabel]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: button cannot be a descendant of button
    <div
      ref={cardRef}
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
        'group/card grid h-auto w-full max-w-full shrink-0 min-w-0 grid-cols-[minmax(0,1fr)_auto]',
        'items-center gap-2 self-start overflow-hidden border border-gray-200 bg-white',
        isSelection ? 'rounded-full px-3 py-2.5 shadow-xs' : 'rounded-full px-4 py-2.5',
        'hover:shadow-xs',
        // don't let the hover border/bg override the selected (blue) state
        !selected && 'hover:border-gray-300 hover:bg-gray-50',
        // motion: fade+rise on mount, ease state changes (hover/selected), press feedback.
        // transitions (not keyframes) so a card added mid-flight retargets smoothly.
        'transition-[opacity,transform,background-color,border-color,box-shadow] duration-150 ease-[var(--ease-out-expo)]',
        'starting:opacity-0 starting:-translate-y-1 motion-reduce:starting:translate-y-0',
        {
          'cursor-pointer active:scale-[0.98] motion-reduce:active:scale-100': isInteractive,
          // border + tint only; no ring (its faint outer band reads as "bg outside the border")
          'border-primary-8 bg-primary-1/30': selected,
        },
        className
      )}
      data-scan-config-block-element={
        blockElement ?? `${ScanConfigUIElementDict.ModelIdentifierMultiple}-${variant}`
      }
    >
      <span
        className={cn(
          'min-w-0 truncate text-sm font-semibold text-primary-9',
          // fade the name out while the (crowding) badge is expanded on hover
          badgeCrowdsName &&
            'transition-opacity duration-300 ease-[var(--ease-out-expo)] group-has-[[data-role=entity-type-badge]:hover]/card:opacity-0'
        )}
      >
        {entityName}
      </span>
      <div className="flex max-w-full min-w-0 items-center justify-end gap-2">
        <span
          data-role="entity-type-badge"
          title={badgeCrowdsName ? typeLabel : undefined}
          className={cn(
            'group/badge relative inline-flex shrink-0 items-center justify-center overflow-hidden',
            'rounded-full border border-neutral-2 bg-white text-xs font-semibold tracking-wide uppercase',
            isSelection ? 'text-gray-400' : 'text-gray-500',
            badgeCrowdsName
              ? // collapsed: a 24px icon chip that expands to the full label on hover.
                // min/max-w (not a fixed w) so `hover:max-w` can actually grow it.
                // on hover the chip's own border/bg drop away so the expanded label
                // reads as plain text on the card, not a second pill inside the card.
                cn(
                  'h-6 min-w-6 max-w-6 px-0 cursor-default',
                  'hover:max-w-[28rem] hover:px-2 hover:border-transparent hover:bg-transparent',
                  'transition-[max-width,padding,border-color,background-color] duration-300 ease-[var(--ease-out-expo)]'
                )
              : 'px-2.5 py-0.5'
          )}
        >
          {badgeCrowdsName ? (
            // absolute so it never occupies flow width (keeps the chip circular);
            // fades out as the label reveals on hover
            <TagsOutlined
              aria-hidden
              className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm transition-opacity duration-200 group-hover/badge:opacity-0"
            />
          ) : null}
          <span
            ref={badgeLabelRef}
            className={cn(
              'whitespace-nowrap',
              // absolute + opacity-0 when collapsed: out of flow (chip stays an
              // icon) but still measurable; reveals in flow on hover
              badgeCrowdsName &&
                'absolute opacity-0 transition-opacity duration-200 group-hover/badge:static group-hover/badge:opacity-100'
            )}
          >
            {typeLabel}
          </span>
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
