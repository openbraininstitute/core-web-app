'use client';

/**
 * @module summary-view
 *
 * configure-page summary for `model_identifier_multiple`: entity pills, group
 * editors, and add actions. opens browse overlay via parent callback
 *
 * field title is rendered by {@link Block}; this component only renders the value ui
 */

import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import { useId } from 'react';

import {
  useScanConfigEntityPreview,
  useSetScanConfigEntityPreview,
} from '@/features/scan-config/bridge/entity-preview';
import { ModelIdentifierEntityCard } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/entity-card';
import { mergeConfigurationInputs } from '@/features/scan-config/components/ui-elements/model-identifier-multiple/helpers';
import { getFromIdRefTypeBadgeLabel, type TFromIdRef } from '@/features/scan-config/helpers';
import { ModelIdentifierFieldStorageMode } from '@/features/scan-config/workflow/workflow-schema-selection';
import { Badge } from '@/ui/molecules/badge';
import { ScrollableList } from '@/ui/molecules/scrollable';
import { Skeleton } from '@/ui/molecules/skeleton';
import { cn } from '@/utils/css-class';

import type {
  TModelIdentifierConfigurationInput,
  TModelIdentifierGroup,
  TModelIdentifierParsedValue,
  TResolvedModelIdentifierEntity,
} from '@/features/scan-config/components/ui-elements/model-identifier-multiple/types';
import type { IWorkflowConfigurationInput } from '@/ui/segments/workflows/config/types';

type TModelIdentifierAddActionButtonProps = {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
};

export function ModelIdentifierAddActionButton({
  label,
  disabled,
  onClick,
  className,
}: TModelIdentifierAddActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'grid h-auto min-h-11 w-full max-w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] px-4 py-2.5 pr-2',
        'items-center gap-2 overflow-hidden rounded-full border border-gray-200 bg-white text-sm text-primary-9',
        'transition-colors hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    >
      <span className="min-w-0 truncate text-left">{label}</span>
      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-xs text-primary-9">
        <PlusOutlined />
      </span>
    </button>
  );
}

type Props = {
  parsedValue: TModelIdentifierParsedValue;
  fieldSchema: Record<string, unknown>;
  configurationInputs?: readonly IWorkflowConfigurationInput[];
  resolvedEntities: Array<
    TResolvedModelIdentifierEntity & {
      ref: TFromIdRef;
    }
  >;
  pendingIds: ReadonlySet<string>;
  disabled?: boolean;
  /** Opens browse overlay; `groupIndex` set when editing a NamedTuple group. */
  onAddEntities: (groupIndex?: number) => void;
  onRemoveEntity: (ref: TFromIdRef, groupIndex?: number) => void;
  onAddGroup?: () => void;
  onGroupNameChange?: (groupIndex: number, name: string) => void;
  onRemoveGroup?: (groupIndex: number) => void;
};

function findEntityForRef(
  ref: TFromIdRef,
  resolvedEntities: Props['resolvedEntities']
): TResolvedModelIdentifierEntity | undefined {
  return resolvedEntities.find((entity) => entity.id === ref.id_str);
}

function getEntityLabel(mergedInputs: TModelIdentifierConfigurationInput[]): string {
  if (mergedInputs.length === 1) {
    return mergedInputs[0]?.label?.toLowerCase() ?? 'item';
  }

  return 'item';
}

function getAddEntitiesLabel(mergedInputs: TModelIdentifierConfigurationInput[]): string {
  const label = getEntityLabel(mergedInputs);
  return `Add ${label}(s)`;
}

function getAddToScanLabel(mergedInputs: TModelIdentifierConfigurationInput[]): string {
  const label = getEntityLabel(mergedInputs);
  return `Add ${label} to scan`;
}

/**
 * renders list or grouped summary ui for the middle configure column
 *
 * supports three schema shapes via `parsedValue.storageMode`:
 * - **list / tuple**: flat card + "Add X to scan"
 * - **grouped**: per-group cards + "Add group to scan"
 *
 * group list keys use array index (stable while editing names; groups are not reordered in ui)
 */
export function ModelIdentifierSummaryView({
  parsedValue,
  fieldSchema,
  configurationInputs,
  resolvedEntities,
  pendingIds,
  disabled,
  onAddEntities,
  onRemoveEntity,
  onAddGroup,
  onGroupNameChange,
  onRemoveGroup,
}: Props) {
  const instanceId = useId();
  const entityPreview = useScanConfigEntityPreview();
  const setEntityPreview = useSetScanConfigEntityPreview();
  const mergedInputs = mergeConfigurationInputs({ paramSchema: fieldSchema, configurationInputs });
  const addEntitiesLabel = getAddEntitiesLabel(mergedInputs);
  const addToScanLabel = getAddToScanLabel(mergedInputs);

  const renderEntityCards = (refs: TFromIdRef[], groupIndex?: number) => {
    const canRemove = refs.length > 1;

    return refs.map((ref) => {
      const entity = findEntityForRef(ref, resolvedEntities);

      if (!entity) {
        if (pendingIds.has(ref.id_str)) {
          return <Skeleton key={ref.id_str} className="h-11 w-full rounded-full" />;
        }

        return (
          <div
            key={ref.id_str}
            className="rounded-full border border-dashed border-neutral-2 px-4 py-2.5 text-sm text-gray-500"
          >
            {ref.id_str}
          </div>
        );
      }

      return (
        <ModelIdentifierEntityCard
          instanceId={ref.id_str}
          key={ref.id_str}
          entityName={entity.name}
          typeLabel={getFromIdRefTypeBadgeLabel(ref)}
          disabled={disabled}
          showRemove={canRemove}
          selected={
            entityPreview?.record.id === entity.id && entityPreview.dataType === entity.entityType
          }
          onSelect={() =>
            setEntityPreview({
              dataType: entity.entityType,
              record: {
                ...entity,
                type: entity.type ?? entity.entityType,
              },
            })
          }
          onRemove={() => onRemoveEntity(ref, groupIndex)}
        />
      );
    });
  };

  const renderGroupCard = (group: TModelIdentifierGroup, groupIndex: number) => {
    const canRemoveGroup =
      parsedValue.storageMode === ModelIdentifierFieldStorageMode.Grouped &&
      parsedValue.groups.length > 1;

    return (
      <div
        key={groupIndex}
        id={`model-identifier-multiple-summary-view-group-${groupIndex}_${instanceId}`}
        data-testid={`model-identifier-multiple-summary-view-group`}
        className={cn(
          'flex w-full max-w-full min-w-0 flex-col gap-3 overflow-hidden',
          'rounded-2xl border border-neutral-2 bg-white p-4',
          'hover:inset-shadow-sm hover:bg-gray-50'
        )}
      >
        <div className="flex min-w-0 items-center gap-3 pb-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Input
              value={group.name}
              disabled={disabled}
              placeholder="Name of the group"
              variant="borderless"
              className={cn(
                'min-w-0 flex-1 px-0 text-sm shadow-none',
                group.name ? 'font-medium text-primary-9 not-italic' : 'italic text-gray-400'
              )}
              onChange={(event) => onGroupNameChange?.(groupIndex, event.currentTarget.value)}
            />
            {canRemoveGroup && onRemoveGroup ? (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemoveGroup(groupIndex)}
                className={cn(
                  'inline-flex size-7 shrink-0 items-center justify-center',
                  'text-gray-400 transition-colors hover:text-red-500'
                )}
                aria-label="Remove group"
              >
                <DeleteOutlined />
              </button>
            ) : null}
          </div>
          <Badge
            variant="outline"
            rounded
            className="shrink-0 border-gray-200 bg-white w-8 h-8 text-xs font-semibold text-gray-500 tabular-nums"
            aria-label={`${group.elements.length} selected items`}
          >
            {group.elements.length}
          </Badge>
        </div>

        <ScrollableList itemCount={group.elements.length}>
          {renderEntityCards(group.elements, groupIndex)}
        </ScrollableList>

        <ModelIdentifierAddActionButton
          label={addEntitiesLabel}
          disabled={disabled}
          onClick={() => onAddEntities(groupIndex)}
        />
      </div>
    );
  };

  if (parsedValue.storageMode === ModelIdentifierFieldStorageMode.Grouped) {
    return (
      <div className="flex w-full max-w-full min-w-0 flex-col gap-3 overflow-hidden">
        {parsedValue.groups.map((group, groupIndex) => renderGroupCard(group, groupIndex))}

        {onAddGroup ? (
          <ModelIdentifierAddActionButton
            label="Add group to scan"
            disabled={disabled}
            onClick={onAddGroup}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div
      id={`model-identifier-multiple-summary-view-${parsedValue.storageMode}_${instanceId}`}
      data-testid={`model-identifier-multiple-summary-view`}
      className={cn(
        'flex w-full max-w-full min-w-0 flex-col gap-3 overflow-hidden',
        'rounded-2xl border border-neutral-2 bg-white p-4'
      )}
    >
      <ScrollableList itemCount={parsedValue.items.length}>
        {renderEntityCards(parsedValue.items)}
      </ScrollableList>
      <ModelIdentifierAddActionButton
        label={addToScanLabel}
        disabled={disabled}
        onClick={() => onAddEntities()}
      />
    </div>
  );
}
