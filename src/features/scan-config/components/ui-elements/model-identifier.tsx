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
import { type FancyChrome, FancyField } from '@/ui/molecules/fancy-input';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

type ModelIdentifierProps = {
  className?: string;
  entity: TSupportedEntitiesForScanConfiguration;
  value?: ConfigValue;
  chrome?: FancyChrome;
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

export function ModelIdentifier({ className, entity, value, chrome }: ModelIdentifierProps) {
  const entityPreview = useScanConfigEntityPreview();
  const setEntityPreview = useSetScanConfigEntityPreview();
  const dataType = resolveEntityDataType(value, entity);
  const typeLabel = resolveTypeLabel(value, dataType);
  const isSelected =
    Boolean(dataType) && entityPreview?.id === entity.id && entityPreview.dataType === dataType;

  const handleSelect = dataType
    ? () =>
        setEntityPreview({
          dataType,
          id: entity.id,
          record: {
            ...entity,
            type: entity.type ?? dataType,
          },
        })
    : undefined;

  return (
    <FancyField {...chrome} active={isSelected} className={className}>
      <div className="px-1.5 pt-3 pb-1.5">
        {/* biome-ignore lint/a11y/noStaticElementInteractions: the row opens the mini-detail preview */}
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
            'grid w-full max-w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2',
            'overflow-hidden rounded-lg px-3 py-2 transition-colors',
            handleSelect && 'cursor-pointer hover:bg-neutral-1',
            isSelected && 'bg-primary-0 hover:bg-primary-0'
          )}
          data-scan-config-block-element={ScanConfigUIElementDict.ModelIdentifier}
        >
          <span className="min-w-0 truncate text-sm font-semibold text-primary-9">
            {entity.name}
          </span>
          <span className="shrink-0 rounded-full border border-neutral-2 bg-white px-2.5 py-0.5 text-xs font-semibold tracking-wide text-gray-500 uppercase">
            {typeLabel}
          </span>
        </div>
      </div>
    </FancyField>
  );
}
