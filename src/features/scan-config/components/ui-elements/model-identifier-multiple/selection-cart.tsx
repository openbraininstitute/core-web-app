'use client';

/**
 * @module selection-cart
 *
 * left sidebar of the browse overlay: group name, selected entity pills,
 * confirm/cancel actions. sits flush against the entity table
 */

import { CheckOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import { useId } from 'react';

import { ModelIdentifierEntityCard } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/entity-card';
import { countSelectedEntities } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/helpers';
import { getEntityTypeTagLabel } from '@/features/scan-config/helpers';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TModelIdentifierBrowseSelectionsByType } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/types';

type Props = {
  /** field title shown above the cart panel. */
  title: string;
  /** in-memory cart keyed by browse entity type. */
  selectionsByType: TModelIdentifierBrowseSelectionsByType;
  onRemoveEntity: (entityType: TExtendedEntitiesTypeDict, entityId: string) => void;
  /** when set, renders editable group name input (grouped schema mode) */
  groupName?: string;
  onGroupNameChange?: (name: string) => void;
  disabled?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
};

/**
 * browse overlay selection cart with scrollable entity list and footer actions
 *
 * remove is hidden when only one entity remains (`selectedCount > 1` rule)
 * confirm is disabled when cart is empty or `confirmDisabled` is true
 */
export function ModelIdentifierSelectionCart({
  title,
  selectionsByType,
  onRemoveEntity,
  groupName,
  onGroupNameChange,
  disabled,
  confirmDisabled,
  onConfirm,
  onCancel,
  className,
}: Props) {
  const instanceId = useId();
  const selectedCount = countSelectedEntities(selectionsByType);

  return (
    <div
      id={`selection-cart-${instanceId}`}
      className={cn(
        'flex h-full min-h-0 w-full min-w-0 flex-col gap-4 bg-white py-4 px-2',
        'rounded-2xl border border-gray-200',
        className
      )}
    >
      <div className="text-base px-2 font-semibold tracking-wide text-gray-500 uppercase">
        {title}
      </div>

      <div className={cn('flex min-h-0 flex-1 px-2 flex-col gap-3 overflow-hidden pb-2 bg-white')}>
        {groupName !== undefined ? (
          <Input
            value={groupName}
            disabled={disabled}
            id={`group-name-input-${instanceId}`}
            placeholder="Name of the group"
            variant="borderless"
            className={cn(
              'min-w-0 px-0 pb-2 text-sm shadow-none rounded-none',
              'focus-within:border-neutral-2 focus-within:border-b focus-within:ring-0 focus-within:ring-transparent',
              groupName ? 'font-bold text-primary-9 not-italic text-base' : 'text-gray-600'
            )}
            onChange={(event) => onGroupNameChange?.(event.currentTarget.value)}
          />
        ) : null}

        <div className="secondary-scrollbar min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-2 pr-1.5">
            {Object.entries(selectionsByType).flatMap(([entityType, rows]) =>
              (rows ?? []).map((entity) => (
                <ModelIdentifierEntityCard
                  instanceId={`${entityType}-${entity.id}`}
                  key={`${entityType}-${entity.id}`}
                  variant="selection"
                  entityName={entity.name}
                  typeLabel={getEntityTypeTagLabel(entityType as TExtendedEntitiesTypeDict)}
                  disabled={disabled}
                  showRemove={selectedCount > 1}
                  onRemove={() =>
                    onRemoveEntity(entityType as TExtendedEntitiesTypeDict, entity.id)
                  }
                />
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto w-full min-w-0 px-2">
        <SelectionConfirmActions
          selectedCount={selectedCount}
          disabled={disabled}
          confirmDisabled={confirmDisabled}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </div>
    </div>
  );
}

type TSelectionConfirmActionsProps = {
  /** staged entity count; drives the `(n)` suffix and the empty-selection guard */
  selectedCount: number;
  /** hide the `(n)` suffix where the field only ever takes one entity */
  showCount?: boolean;
  disabled?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** `stacked` fills the cart footer; `inline` sits in the cart-less action bar */
  layout?: 'stacked' | 'inline';
  className?: string;
};

/**
 * confirm / cancel pair for the browse overlay
 *
 * shared so the cart footer (multi-select) and the inline action bar
 * (single-select, or multi-select beside the mini detail view) stay identical
 */
export function SelectionConfirmActions({
  selectedCount,
  showCount = true,
  disabled,
  confirmDisabled,
  onConfirm,
  onCancel,
  layout = 'stacked',
  className,
}: TSelectionConfirmActionsProps) {
  const isInline = layout === 'inline';

  return (
    <div
      className={cn(
        'flex min-w-0',
        isInline ? 'flex-row-reverse items-center gap-2' : 'w-full flex-col gap-2',
        className
      )}
    >
      <Button
        type="button"
        rounded
        variant="success"
        size="responsive"
        disabled={disabled || confirmDisabled || selectedCount === 0}
        className={cn(
          'h-12 justify-between pl-5 pr-1.5! text-base font-semibold shadow-skmp-s',
          isInline ? 'min-w-44' : 'w-full'
        )}
        onClick={onConfirm}
      >
        <span>Confirm {showCount && selectedCount > 0 ? `(${selectedCount})` : ''}</span>
        <span className="flex p-2 items-center justify-center rounded-full bg-white/20">
          <CheckOutlined className="text-base" />
        </span>
      </Button>
      <Button
        rounded
        type="button"
        variant="ghost"
        size="responsive"
        disabled={disabled}
        onClick={onCancel}
        className="py-1 text-center text-sm text-primary-9 transition-colors hover:text-primary-9/80 disabled:opacity-50"
      >
        Cancel
      </Button>
    </div>
  );
}
