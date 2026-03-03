'use client';

import { CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { useAtom } from 'jotai';
import { useCallback, useId, useState } from 'react';

import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Badge, BadgeButton } from '@/ui/molecules/badge';
import { Button } from '@/ui/molecules/button';
import { Modal } from '@/ui/molecules/modal';
import { coreSelectedRowsAtom } from '@/ui/segments/data-table/elements/context';
import { makeDataKey } from '@/ui/segments/data-table/elements/helpers';
import { WorkflowScopeTabs } from '@/ui/segments/workflows/elements/scope-selector';
import { cn } from '@/utils/css-class';

import type { TEntityTypeDict } from '@/api/entitycore/types';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { ConfigValue } from '@/features/scan-config/types';

export type SelectorValue = { id_str: string; type: string };
interface SelectorModalProps {
  disabled?: boolean;
  entityType: TEntityTypeDict;
  onChange: (value?: SelectorValue | undefined) => void;
  filters?: Record<string, unknown>;
  value?: ConfigValue;
  valueType?: string;
}

export function EntitySelectorSingle({
  onChange,
  entityType,
  disabled,
  filters = {},
  value,
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
  const displayEntity =
    usedRow ??
    (value && typeof value === 'object' && ('name' in value || 'id_str' in value) ? value : null);

  const usedName =
    displayEntity && 'name' in displayEntity
      ? (displayEntity.name as string)
      : (displayEntity as SelectorValue)?.id_str;
  const usedKey =
    displayEntity && 'id' in displayEntity
      ? (displayEntity.id as string)
      : (displayEntity as SelectorValue)?.id_str;

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleModalConfirm = () => {
    const selected = selectedRows.at(0);
    if (selected && valueType) {
      setUsedRow(selected);
      onChange({ id_str: selected.id, type: valueType });
    }
    setIsModalOpen(false);
  };

  const handleModalClose = () => setIsModalOpen(false);

  const handleRemoveRecording = useCallback(() => {
    onChange(undefined);
  }, [onChange]);

  const onRowsSelected = useCallback(
    (rows: Array<EntityCoreIdentifiableNamed>) => {
      setSelectedRows(rows);
    },
    [setSelectedRows]
  );

  return (
    <div className="w-full">
      <div className="w-full">
        <Button
          type="button"
          variant="outline"
          onClick={handleOpenModal}
          className={cn(
            'border-label relative h-auto min-h-10 w-full justify-start p-1 focus-within:bg-white',
            ' lg:min-h-12 active:border-primary-8 active:border-2! active:bg-white',
            'focus-within:bg-white focus-within:shadow-none! focus-within:ring-0!'
          )}
          disabled={disabled}
        >
          <div className="flex min-h-8 flex-1 flex-wrap items-center gap-1 select-none">
            {displayEntity ? (
              <Badge
                key={usedKey}
                variant="outline"
                className={cn(
                  'flex h-8 items-center gap-1 py-1! lg:h-9',
                  'hover:bg-neutral-1 hover:text-primary-8'
                )}
              >
                <span className="text-primary-9 max-w-50 truncate text-base font-semibold lg:text-lg">
                  {usedName}
                </span>
                <BadgeButton onClick={handleRemoveRecording} disabled={disabled}>
                  <CloseOutlined className="text-xs! [&>svg]:size-3!" />
                </BadgeButton>
              </Badge>
            ) : (
              <span className="px-2.5 text-slate-500">
                Select <span className="font-semibold">{entityConfig?.title}</span>
              </span>
            )}
          </div>
          <SearchOutlined
            className={cn(
              'text-primary-9 absolute end-5 top-1/2 ',
              '-translate-y-1/2 [&_svg]:size-3.5!'
            )}
          />
        </Button>
      </div>

      <Modal
        destroyOnClose
        open={isModalOpen}
        afterClose={() => setSelectedRows([])}
        onClose={handleModalClose}
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
              <Button
                rounded
                variant="outline"
                className="h-10 px-10 lg:h-12"
                onClick={handleModalClose}
              >
                Cancel
              </Button>
              <Button
                rounded
                className="h-10 px-10 lg:h-12"
                variant="default"
                onClick={handleModalConfirm}
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
            requireBrainRegion={false}
            requireMiniDetailView={false}
            section={WorkspaceSection.SimulateWorkflow}
            dataType={entityType}
            scope={WorkspaceScope.Public}
            extraQueryParams={filters}
            mainTableProps={{
              selectionType: 'radio',
              onRowsSelected,
            }}
            classNames={{
              container: 'h-full',
              filterClassNames: {
                container: 'w-2/5 min-h-full',
              },
            }}
            left={<WorkflowScopeTabs className="max-w-max" defaultScope={WorkspaceScope.Public} />}
          />
        </div>
      </Modal>
    </div>
  );
}
