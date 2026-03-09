'use client';

import { CloseOutlined, SearchOutlined } from '@ant-design/icons';
import { type FieldProps, isObject } from '@rjsf/utils';
import { compact, get, isEmpty, snakeCase } from 'es-toolkit/compat';
import { useAtom, useSetAtom } from 'jotai';
import { useCallback, useMemo, useState } from 'react';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Badge, BadgeButton } from '@/ui/molecules/badge';
import { Button } from '@/ui/molecules/button';
import { Modal } from '@/ui/molecules/modal';
import { coreSelectedRowsAtom } from '@/ui/segments/data-table/elements/context';
import {
  CONFIGURATION_RECORDING_STATE_KEY,
  IonChannelRecordingAtomFamily,
} from '@/ui/segments/workflows/build/ion-channel-build/helpers';
import { renderMathInText } from '@/ui/segments/workflows/build/ion-channel-build/rjsf/helpers';
import {
  descriptionClasses,
  labelClasses,
} from '@/ui/segments/workflows/build/ion-channel-build/rjsf/theme/classes';
import { cn } from '@/utils/css-class';

import type { IIonChannelRecording } from '@/api/entitycore/types/entities/ion-channel-recording';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';

type RecordingFormData = {
  id_str: string;
  type: 'IonChannelRecordingFromID';
};

export function RecordingsArrayField(props: FieldProps) {
  const { onChange, disabled, readonly, schema, fieldPathId, required, registry } = props;
  const minItems = typeof schema?.minItems === 'number' ? schema.minItems : 1;
  const maxItems = typeof schema?.maxItems === 'number' ? schema.maxItems : 1;
  const title = schema?.title;
  const description = schema?.description;
  const sessionId = get(registry.formContext, 'sessionId') as string;

  const handleRecordingsChange = useCallback(
    (newRecording?: RecordingFormData, suffix?: string) => {
      onChange(
        isObject(newRecording) && !isEmpty(newRecording) ? newRecording : undefined,
        fieldPathId.path
      );
      onChange(suffix ? snakeCase(suffix) : undefined, ['initialize', 'ion_channel_name']);
    },
    [onChange, fieldPathId.path]
  );

  return (
    <div className="w-full">
      <label htmlFor={fieldPathId.$id} className={labelClasses}>
        {typeof title === 'string' ? renderMathInText(title) : title}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {description && <div className={descriptionClasses}>{description}</div>}
      <RecordingsArrayFieldContent
        onChange={handleRecordingsChange}
        disabled={disabled}
        readonly={readonly}
        minItems={minItems}
        maxItems={maxItems}
        sessionId={sessionId}
      />
    </div>
  );
}

interface RecordingsArrayFieldContentProps {
  onChange: (recordings?: RecordingFormData | undefined, suffix?: string | undefined) => void;
  disabled?: boolean;
  readonly?: boolean;
  minItems: number;
  maxItems: number;
  sessionId: string;
}

function RecordingsArrayFieldContent({
  onChange,
  disabled,
  readonly,
  minItems,
  maxItems,
  sessionId,
}: RecordingsArrayFieldContentProps) {
  const { virtualLabId, projectId } = useWorkspace();

  const [recording, updateRecordingStorage] = useAtom(
    useMemo(
      () => IonChannelRecordingAtomFamily(`${CONFIGURATION_RECORDING_STATE_KEY}/${sessionId}`),
      [sessionId]
    )
  );

  const dataKey = compact([
    virtualLabId,
    projectId,
    WorkspaceSection.BuildWorkflow,
    ExtendedEntitiesTypeDict.IonChannelRecording,
    WorkspaceScope.BuildIonChannelModel,
  ]).join('/');

  const resetSelectedRows = useSetAtom(coreSelectedRowsAtom(dataKey));
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const isSingleMode = maxItems === 1;

  const isSelectionValid = useMemo(() => {
    const count = !isEmpty(recording) ? 1 : 0;
    return count >= minItems && count <= maxItems;
  }, [recording, minItems, maxItems]);

  const handleOpenModal = useCallback(() => {
    if (!disabled && !readonly) {
      setIsModalOpen(true);
    }
  }, [disabled, readonly]);

  const handleModalConfirm = useCallback(() => {
    if (isSelectionValid && !isEmpty(recording)) {
      updateRecordingStorage(recording);
      onChange(
        { id_str: recording.id, type: 'IonChannelRecordingFromID' },
        recording.ion_channel.name
      );
      setIsModalOpen(false);
    }
  }, [onChange, isSelectionValid, recording, updateRecordingStorage]);

  const handleModalClose = () => setIsModalOpen(false);

  const handleRemoveRecording = useCallback(() => {
    if (readonly || disabled) return;
    onChange(undefined, undefined);
    updateRecordingStorage(null);
  }, [readonly, disabled, onChange, updateRecordingStorage]);

  const handleRowsSelected = useCallback(
    (selectedRows: Array<IIonChannelRecording>) => {
      updateRecordingStorage(selectedRows.at(0) ?? null);
    },
    [updateRecordingStorage]
  );

  return (
    <div className="w-full">
      {/** biome-ignore lint/a11y/useSemanticElements: button can't have nested buttons */}
      <div
        className="w-full"
        role="button"
        tabIndex={0}
        onClick={handleOpenModal}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled && !readonly) {
            e.preventDefault();
            handleOpenModal();
          }
        }}
      >
        <Button
          variant="outline"
          className={cn(
            'border-label relative h-auto min-h-10 w-full justify-start p-1 focus-within:bg-white lg:min-h-12',
            'active:border-primary-8 active:border-2! active:bg-white',
            'focus-within:bg-white focus-within:shadow-none! focus-within:ring-0!'
          )}
          disabled={disabled || readonly}
        >
          <div className="flex min-h-8 flex-1 flex-wrap items-center gap-1 select-none">
            {recording ? (
              <Badge
                key={recording.id}
                variant="outline"
                className={cn(
                  'flex h-8 items-center gap-1 py-1! lg:h-9',
                  'hover:bg-neutral-1 hover:text-primary-8'
                )}
              >
                <span className="text-primary-9 max-w-50 truncate text-base font-semibold lg:text-lg">
                  {recording.name}
                </span>
                {!readonly && !disabled && (
                  <BadgeButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveRecording();
                    }}
                    disabled={disabled}
                  >
                    <CloseOutlined className="text-xs! [&>svg]:size-3!" />
                  </BadgeButton>
                )}
              </Badge>
            ) : (
              <span className="px-2.5 text-slate-500">Click to select recording</span>
            )}
          </div>
          <SearchOutlined className="text-primary-9 absolute end-5 top-1/2 -translate-y-1/2 [&_svg]:size-3.5!" />
        </Button>
      </div>

      <Modal
        destroyOnClose
        open={isModalOpen}
        afterClose={() => resetSelectedRows([])}
        onClose={handleModalClose}
        title={`Select Ion channel recording${maxItems > 1 ? 's' : ''}`}
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
                disabled={!isSelectionValid}
              >
                Select
              </Button>
            </div>
          </div>
        }
      >
        <div className="h-full w-full">
          <BrowseEntityScope
            requireScopeSelector
            section={WorkspaceSection.BuildWorkflow}
            requireBrainRegion={false}
            requireMiniDetailView={false}
            dataType={ExtendedEntitiesTypeDict.IonChannelRecording}
            scope={WorkspaceScope.BuildIonChannelModel}
            mainTableProps={{
              selectionType: isSingleMode ? 'radio' : 'checkbox',
              onRowsSelected: (rows: EntityCoreIdentifiableNamed[]) => {
                return handleRowsSelected(rows as IIonChannelRecording[]);
              },
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
