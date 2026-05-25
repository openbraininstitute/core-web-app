'use client';

import {
  useScanConfigEntityPreview,
  useSetScanConfigEntityPreview,
} from '@/features/scan-config/bridge/entity-preview';
import {
  getEntityTypeTagLabel,
  getFromIdRefTypeBadgeLabel,
  isFromIdRef,
} from '@/features/scan-config/helpers';
import {
  type ConfigValue,
  ScanConfigUIElementDict,
  type TSupportedEntitiesForScanConfiguration,
} from '@/features/scan-config/types';
import { entityTypeForScanConfigFromIdType } from '@/features/scan-config/workflow/workflow-schema-selection';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

type ModelIdentifierProps = {
  className?: string;
  entity: TSupportedEntitiesForScanConfiguration;
  value?: ConfigValue;
};

function resolveEntityDataType(
  value: ConfigValue | undefined,
  entity: TSupportedEntitiesForScanConfiguration
): TExtendedEntitiesTypeDict | undefined {
  if (isFromIdRef(value)) {
    return entityTypeForScanConfigFromIdType(value.type);
  }

  if (typeof entity.type === 'string') {
    return entity.type as TExtendedEntitiesTypeDict;
  }

  return undefined;
}

function resolveTypeLabel(
  value: ConfigValue | undefined,
  dataType: TExtendedEntitiesTypeDict | undefined
): string {
  if (isFromIdRef(value)) {
    return getFromIdRefTypeBadgeLabel(value);
  }

  if (dataType) {
    return getEntityTypeTagLabel(dataType);
  }

  return '';
}

export function ModelIdentifier({ className, entity, value }: ModelIdentifierProps) {
  const entityPreview = useScanConfigEntityPreview();
  const setEntityPreview = useSetScanConfigEntityPreview();
  const dataType = resolveEntityDataType(value, entity);
  const typeLabel = resolveTypeLabel(value, dataType);
  const isSelected =
    Boolean(dataType) &&
    entityPreview?.record.id === entity.id &&
    entityPreview.dataType === dataType;

  const handleSelect = dataType
    ? () =>
        setEntityPreview({
          dataType,
          record: {
            ...entity,
            type: entity.type ?? dataType,
          },
        })
    : undefined;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: summary pill opens mini-detail preview
    <div
      id={`model-identifier-entity-${entity.id}`}
      data-testid="model-identifier-entity"
      role={handleSelect ? 'button' : undefined}
      tabIndex={handleSelect ? 0 : undefined}
      onClick={handleSelect}
      onKeyDown={
        handleSelect
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                handleSelect();
              }
            }
          : undefined
      }
      className={cn(
        'grid min-h-14 h-auto w-full max-w-full min-w-0 grid-cols-[minmax(0,1fr)_auto]',
        'items-center gap-2 overflow-hidden rounded-full border border-gray-200 bg-white px-4 py-2.5',
        'hover:border-gray-300 hover:shadow-xs hover:bg-gray-50',
        {
          'cursor-pointer': Boolean(handleSelect),
          'border-primary-8 bg-primary-1/30 ring-1 ring-primary-8/20': isSelected,
        },
        className
      )}
      data-scan-config-block-element={ScanConfigUIElementDict.ModelIdentifier}
    >
      <span className="min-w-0 truncate text-sm font-semibold text-primary-9">{entity.name}</span>
      <span className="shrink-0 rounded-full border border-neutral-2 bg-white px-2.5 py-0.5 text-xs font-semibold tracking-wide text-gray-500 uppercase">
        {typeLabel}
      </span>
    </div>
  );
}
