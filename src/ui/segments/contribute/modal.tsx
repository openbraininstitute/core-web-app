import { CloseOutlined } from '@ant-design/icons';
import { isNil } from 'es-toolkit/compat';
import { useState } from 'react';
import { match, P } from 'ts-pattern';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreConfiguration } from '@/entity-configuration/domain';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { Button } from '@/ui/molecules/button';
import { Modal } from '@/ui/molecules/modal';
import { SelectPopover } from '@/ui/molecules/select-popover';
import { CellMorphology } from '@/ui/segments/contribute/cell-morphology';
import { ElectricalCellRecording } from '@/ui/segments/contribute/electrical-cell-recording';
import {
  makeSelectContributionEntityClickEvent,
  useContributionEntityClickEvent,
} from '@/ui/segments/contribute/event';
import { ExperimentalNeuronDensity } from '@/ui/segments/contribute/experimental-neuron-density';
import { cn } from '@/utils/css-class';

interface IExtendedEntitiesSelectorProps {
  onSelectEntityType: (type: TExtendedEntitiesTypeDict) => void;
}

function ExtendedEntitiesSelector({ onSelectEntityType }: IExtendedEntitiesSelectorProps) {
  const options = Object.entries(EntityCoreConfiguration)
    .map(([, value]) => ({
      label: value.title,
      value: value.extendedType,
      data: {
        isUploadable: value.isUploadable ?? false,
      },
    }))
    .sort((a, b) => {
      return Number(b.data.isUploadable) - Number(a.data.isUploadable);
    });

  return (
    <div className="w-full px-5">
      <div className="border-neutral-2 rounded-2xl border p-4 py-9">
        <div className="text-primary-9 mb-3 text-lg font-bold">
          Select an artifact you want to upload
        </div>
        <SelectPopover
          options={options}
          placeholder="select an artifact "
          searchPlaceholder="search an artifact"
          onSelect={(option) => {
            onSelectEntityType?.(option?.value as TExtendedEntitiesTypeDict);
          }}
          searchable={false}
          selectedValue={undefined}
          clsx={{
            trigger:
              'rounded-full border-none w-full  h-12! shadow-[16px_16px_30px_0px_#00000014,_-12px_-8px_32px_0px_#FFFFFF12]',
            content: 'z-[99999]',
            rowClassName(option) {
              return cn({
                'pointer-events-none select-none opacity-50': !option.data?.isUploadable,
              });
            },
          }}
        />
      </div>
    </div>
  );
}

interface IRenderEntityTypeContentProps {
  type: TExtendedEntitiesTypeDict;
  sessionId: string;
}

function RenderEntityTypeContent({ type, sessionId: sId }: IRenderEntityTypeContentProps) {
  return match({ type })
    .with({ type: ExtendedEntitiesTypeDict.CellMorphology }, () => (
      <CellMorphology sessionId={sId} />
    ))
    .with({ type: ExtendedEntitiesTypeDict.ElectricalCellRecording }, () => (
      <ElectricalCellRecording sessionId={sId} />
    ))
    .with({ type: ExtendedEntitiesTypeDict.ExperimentalNeuronDensity }, () => (
      <ExperimentalNeuronDensity sessionId={sId} />
    ))
    .otherwise(() => null);
}

export function ContributionModal() {
  const [{ entityType, sessionId, display }, setEventPayload] = useState<{
    display: boolean;
    entityType: TExtendedEntitiesTypeDict | null;
    sessionId: string | null;
  }>({
    display: false,
    entityType: null,
    sessionId: null,
  });

  const onSelectEntityType = (type: TExtendedEntitiesTypeDict): void => {
    setEventPayload({ sessionId, display, entityType: type });
  };

  const onClose = (): void => {
    makeSelectContributionEntityClickEvent({
      display: false,
      entityType: null,
      sessionId: null,
    });
  };

  useContributionEntityClickEvent(({ detail }) => {
    setEventPayload(detail);
  });

  const entity = getEntityByExtendedType({ type: entityType ?? undefined });
  const title = match({ entityType, entity })
    .with({ entityType: P.union(P.nullish, P._), entity: P.nullish }, () => 'Add new artifact')
    .with(
      {
        entityType: P.string.select('type'),
        entity: P.not(P.nullish).select('entity'),
      },
      ({ entity: et }) => `Add new ${et.title ?? 'artifact'}`
    )
    .otherwise(() => null);

  const content = match({ entityType, sessionId, entity })
    .with({ entityType: P.union(P.nullish, P._), entity: P.nullish }, () => (
      <ExtendedEntitiesSelector onSelectEntityType={onSelectEntityType} />
    ))
    .with(
      {
        sessionId: P.string.select('sId'),
        entityType: P.string.select('type'),
      },
      ({ sId, type }) => {
        return <RenderEntityTypeContent type={type} sessionId={sId} />;
      }
    )
    .otherwise(() => null);

  if (isNil(sessionId)) return null;

  return (
    <Modal
      open={display}
      position="center"
      className="h-full max-h-[calc(100vh-6rem)] min-h-[400px] w-[50rem] rounded-2xl"
      bodyClassName="flex flex-col h-full min-h-0 max-h-full overflow-hidden p-0 relative"
      overlayClassName="bg-primary-9/80 backdrop-blur-sm!"
      headerClassName={cn('w-full rounded-t-2xl pb-2', '[&_#modal-title]:w-full')}
      onClose={onClose}
      closable={false}
      title={
        <div className="flex w-full items-center justify-between gap-2">
          <h3 className="text-primary-9 text-2xl font-bold">{title}</h3>
          <Button
            variant="icon"
            className="text-primary-9 hover:text-primary-6 hover:bg-background ml-auto size-8 bg-white text-lg"
            onClick={onClose}
          >
            <CloseOutlined />
          </Button>
        </div>
      }
    >
      {content}
    </Modal>
  );
}
