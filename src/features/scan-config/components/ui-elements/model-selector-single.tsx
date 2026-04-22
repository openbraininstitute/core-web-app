'use client';

import { CloseOutlined, LinkOutlined, SearchOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { type SetStateAction, useAtom } from 'jotai';
import { useCallback, useId, useRef, useState } from 'react';

import { type TWorkspaceScope, WorkspaceScope, WorkspaceSection } from '@/constants';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import {
  type ConfigValue,
  ScanConfigUIElementDict,
  type SetAtom,
} from '@/features/scan-config/types';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Badge, BadgeButton } from '@/ui/molecules/badge';
import { Button } from '@/ui/molecules/button';
import { Modal } from '@/ui/molecules/modal';
import { Skeleton } from '@/ui/molecules/skeleton';
import { coreSelectedRowsAtom } from '@/ui/segments/data-table/elements/context';
import { makeDataKey } from '@/ui/segments/data-table/elements/helpers';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';

export type SelectorValue = { id_str: string; type: string };
interface SelectorModalProps {
  disabled?: boolean;
  entityType: TEntityTypeDict;
  onChange: SetAtom<[SetStateAction<Record<string, ConfigValue>>], void>;
  filters?: Record<string, unknown>;
  value?: ConfigValue;
  valueType?: string;
  state: Record<string, ConfigValue>;
  fieldKey: string;
}
export function EntitySelectorSingle({
  onChange,
  entityType,
  disabled,
  filters = {},
  value,
  state,
  fieldKey,
  valueType,
}: SelectorModalProps) {
  const instanceId = useId();
  const { virtualLabId, projectId } = useWorkspace();
  const entityConfig = getEntityByExtendedType({ type: entityType });

  const { dataKey } = makeDataKey({
    virtualLabId,
    projectId,
    section: WorkspaceSection.SimulateWorkflow,
    dataType: entityType,
    scope: WorkspaceScope.Public,
    id: instanceId,
  });

  const [selectedRows, setSelectedRows] = useAtom(coreSelectedRowsAtom(dataKey));
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [usedRow, setUsedRow] = useState<EntityCoreIdentifiableNamed | null>(null);
  const scopeRef = useRef<{ changeScope: (value: TWorkspaceScope | null) => void } | null>(null);

  const displayEntity =
    usedRow ??
    (value && typeof value === 'object' && ('name' in value || 'id_str' in value) ? value : null);

  const usedKey =
    displayEntity && 'id' in displayEntity
      ? (displayEntity.id as string)
      : (displayEntity as SelectorValue)?.id_str;

  const { data, isLoading } = useQuery<EntityCoreIdentifiableNamed | undefined>({
    queryKey: keyBuilder.entity({ context: { virtualLabId, projectId }, id: usedKey }),
    queryFn: async () => {
      return entityConfig?.api.query.one({ context: { virtualLabId, projectId }, id: usedKey });
    },
    enabled: !!usedKey,
    staleTime: 600, // 10 minutes
  });

  const onDisplay = useCallback(() => setIsModalOpen(true), []);
  const onClose = () => setIsModalOpen(false);

  const onSelect = () => {
    const selected = selectedRows.at(0);
    if (selected && valueType) {
      setUsedRow(selected);
      onChange({ ...state, [fieldKey]: { id_str: selected.id, type: valueType } });
    }
    onClose();
    scopeRef.current?.changeScope(null);
  };

  const onRemoveRecording = useCallback(() => {
    setUsedRow(null);
    onChange({ ...state, [fieldKey]: null });
    onDisplay();
  }, [onChange, onDisplay, fieldKey, state]);

  const onRowsSelected = (rows: Array<EntityCoreIdentifiableNamed>) => {
    setSelectedRows(rows);
  };

  return (
    <div className="w-full">
      <div className="w-full">
        <Button
          data-scan-config-block-element={ScanConfigUIElementDict.ModelSelectorSingle}
          type="button"
          variant="outline"
          onClick={data?.id ? undefined : onDisplay}
          className={cn(
            'border-label relative h-auto min-h-10 w-full items-start justify-start p-1 focus-within:bg-white',
            'lg:min-h-12 active:border-primary-8 active:border-2! active:bg-white',
            'focus-within:bg-white focus-within:shadow-none! focus-within:ring-0!',
            'has-[.placeholder]:items-center',
            { 'pointer-events-none': disabled }
          )}
          aria-disabled={disabled}
          disabled={disabled}
        >
          <div className="flex flex-1 flex-wrap items-center gap-1 select-none">
            {isLoading ? (
              <Skeleton className="h-10 w-full bg-gray-100 rounded-md max-w-[calc(100%-30px)]" />
            ) : displayEntity && !isLoading ? (
              <Badge
                key={data?.id}
                variant="outline"
                className={cn(
                  'relative flex h-auto items-start justify-start gap-1 py-1!',
                  'hover:bg-gray-100 hover:text-primary-8 min-w-0 w-full',
                  { 'pointer-events-none': disabled },
                  { 'max-w-[calc(100%-30px)]': !disabled }
                )}
                aria-disabled={disabled}
              >
                <div
                  className={cn('flex flex-col items-start min-w-0 w-full', {
                    'max-w-[calc(100%-1.75rem)]': !disabled,
                  })}
                >
                  <div
                    className={cn(
                      'flex items-center justify-between gap-1',
                      'text-primary-9 min-w-0 max-w-full text-xs lg:text-sm'
                    )}
                    title={data?.id}
                  >
                    <span className="truncate max-w-[calc(100%-30px)]">{data?.id}</span>
                    <a
                      href={`/app/entity/${data?.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                      className={cn(
                        'inline-flex items-center justify-center text-primary-9 min-w-6!',
                        'min-h-6! px-1 border-gray-200 bg-white',
                        'transition-colors hover:bg-gray-100 hover:border-gray-300 rounded-full',
                        'hover:text-primary-9 pointer-events-auto [&_svg]:pointer-events-auto'
                      )}
                      aria-label={`View ion channel ${data?.name}`}
                    >
                      <LinkOutlined />
                    </a>
                  </div>
                  <div className="text-sm lg:text-base font-semibold">{data?.name}</div>
                </div>
                {!disabled && (
                  <BadgeButton
                    onClick={onRemoveRecording}
                    className="absolute end-3 top-1/2 -translate-y-1/2"
                  >
                    <CloseOutlined className="text-xs! [&>svg]:size-3!" />
                  </BadgeButton>
                )}
              </Badge>
            ) : (
              <span className="placeholder px-2.5 text-slate-500">
                Select <span className="font-semibold">{entityConfig?.title}</span>
              </span>
            )}
          </div>
          {!disabled && (
            <div className={cn('absolute end-3 top-1/2 ', '-translate-y-1/2 [&_svg]:size-3.5!')}>
              <SearchOutlined className={cn('text-primary-9 ')} />
            </div>
          )}
        </Button>
      </div>

      <Modal
        destroyOnClose
        open={isModalOpen}
        afterClose={() => setSelectedRows([])}
        onClose={onClose}
        title={
          <div className="text-primary-9 text-2xl font-light">
            Select <span className="font-bold">{entityConfig?.title}</span>
          </div>
        }
        headerClassName="[&>div]:text-2xl! select-none font-bold [&>div]:text-primary-8! "
        bodyClassName="h-full w-full max-h-[calc(100vh-140px)]"
        className="h-screen w-screen rounded-none"
        size="full"
        footer={
          <div className="flex items-center justify-between gap-4">
            <div className="flex gap-2">
              <Button rounded variant="outline" className="h-10 px-10 lg:h-12" onClick={onClose}>
                Cancel
              </Button>
              <Button
                rounded
                className="h-10 px-10 lg:h-12"
                variant="default"
                onClick={onSelect}
                disabled={selectedRows.length === 0}
              >
                Select
              </Button>
            </div>
          </div>
        }
      >
        <div className="h-full w-full">
          <BrowseEntityScope
            id={instanceId}
            requireScopeSelector
            requireBrainRegion={false}
            requireMiniDetailView={false}
            section={WorkspaceSection.SimulateWorkflow}
            dataType={entityType}
            scope={WorkspaceScope.Public}
            extraQueryParams={filters}
            mainTableProps={{
              selectionType: 'radio',
              onRowsSelected,
              searchOpenOnMount: true,
            }}
            classNames={{
              container: 'h-full',
              filterClassNames: {
                container: 'w-2/5 min-h-full',
              },
            }}
          />
        </div>
      </Modal>
    </div>
  );
}
