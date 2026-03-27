import { CloseOutlined } from '@ant-design/icons';
import { isNil } from 'es-toolkit/compat';
import { useState } from 'react';
import { match, P } from 'ts-pattern';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityCoreConfiguration } from '@/entity-configuration/domain';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { Button } from '@/ui/molecules/button';
import { Modal } from '@/ui/molecules/modal';
import { SelectPopover } from '@/ui/molecules/select-popover';
import { CellMorphology, CellMorphologyImport } from '@/ui/segments/contribute/cell-morphology';
import {
  ElectricalCellRecording,
  ElectricalCellRecordingImport,
} from '@/ui/segments/contribute/electrical-cell-recording';
import { EMCellMesh } from '@/ui/segments/contribute/em-cell-mesh';
import {
  makeSelectContributionEntityClickEvent,
  useContributionEntityClickEvent,
} from '@/ui/segments/contribute/event';
import { ExperimentalBoutonDensity } from '@/ui/segments/contribute/experimental-bouton-density';
import { ExperimentalNeuronDensity } from '@/ui/segments/contribute/experimental-neuron-density';
import { ExperimentalSynapsesPerConnection } from '@/ui/segments/contribute/synapses-per-connection';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

const ContributionEntryMode = {
  Legacy: 'legacy',
  Import: 'import',
} as const;

type TContributionEntryMode = (typeof ContributionEntryMode)[keyof typeof ContributionEntryMode];

const ImportArtifactSupport = {
  [ExtendedEntitiesTypeDict.CellMorphology]: true,
  [ExtendedEntitiesTypeDict.ElectricalCellRecording]: true,
} as const as Partial<Record<TExtendedEntitiesTypeDict, boolean>>;

interface IExtendedEntitiesSelectorProps {
  onSelectEntityType: (params: {
    type: TExtendedEntitiesTypeDict;
    mode: TContributionEntryMode;
  }) => void;
}

function buildContributionArtifactOptions(mode: TContributionEntryMode) {
  const options = Object.entries(EntityCoreConfiguration)
    .filter(([, p]) => p.isContributionOption ?? true)
    .map(([, value]) => ({
      label: value.title,
      value: value.extendedType,
      data: {
        disabled:
          mode === ContributionEntryMode.Legacy
            ? !(value.isContributable ?? false)
            : !ImportArtifactSupport[value.extendedType],
        mode,
      },
    }))
    .sort((a, b) => {
      return Number(a.data.disabled) - Number(b.data.disabled);
    });

  return options;
}

interface ContributionArtifactSelectorProps {
  title: string;
  description: string;
  testId: string;
  mode: TContributionEntryMode;
  onSelectEntityType: IExtendedEntitiesSelectorProps['onSelectEntityType'];
}

function ContributionArtifactSelector({
  title,
  description,
  testId,
  mode,
  onSelectEntityType,
}: ContributionArtifactSelectorProps) {
  const options = buildContributionArtifactOptions(mode);

  return (
    <div data-testid={testId} className="w-full">
      <div className="border-neutral-2 rounded-2xl border p-4 py-5">
        <div className="text-primary-9 text-lg font-bold">{title}</div>
        <p className="text-sm mb-5 text-neutral-500">{description}</p>
        <SelectPopover
          options={options}
          placeholder={
            mode === ContributionEntryMode.Legacy
              ? 'select an artifact for the guided form'
              : 'select an artifact for csv import'
          }
          searchPlaceholder="search an artifact"
          onSelect={(option) => {
            if (!option?.value || option.data?.disabled) {
              return;
            }

            onSelectEntityType?.({
              type: option.value as TExtendedEntitiesTypeDict,
              mode,
            });
          }}
          searchable={false}
          selectedValue={undefined}
          clsx={{
            trigger:
              'rounded-full border-none w-full  h-12! shadow-[16px_16px_30px_0px_#00000014,_-12px_-8px_32px_0px_#FFFFFF12]',
            content: 'z-[99999]',
            rowClassName(option) {
              return cn({
                'pointer-events-none select-none opacity-50': option.data?.disabled,
              });
            },
          }}
        />
      </div>
    </div>
  );
}

function ExtendedEntitiesSelector({ onSelectEntityType }: IExtendedEntitiesSelectorProps) {
  return (
    <div className="flex flex-col w-full gap-4 px-5">
      <ContributionArtifactSelector
        title="Contribute with guided form"
        description="Open multi-step artifact form."
        testId="legacy-form-selector"
        mode={ContributionEntryMode.Legacy}
        onSelectEntityType={onSelectEntityType}
      />
      <ContributionArtifactSelector
        title="Import from CSV"
        description="Open the CSV import and validation flow."
        testId="csv-import-selector"
        mode={ContributionEntryMode.Import}
        onSelectEntityType={onSelectEntityType}
      />
    </div>
  );
}

interface IRenderEntityTypeContentProps {
  title: string | null;
  type: TExtendedEntitiesTypeDict;
  sessionId: string;
  onClose: () => void;
}

function RenderLegacyEntityTypeContent({
  title,
  type,
  sessionId: sId,
  onClose,
}: IRenderEntityTypeContentProps) {
  const content = match({ type })
    .with(
      {
        type: ExtendedEntitiesTypeDict.CellMorphology,
      },
      () => <CellMorphology sessionId={sId} />
    )
    .with({ type: ExtendedEntitiesTypeDict.ElectricalCellRecording }, () => (
      <ElectricalCellRecording sessionId={sId} />
    ))
    .with({ type: ExtendedEntitiesTypeDict.ExperimentalNeuronDensity }, () => (
      <ExperimentalNeuronDensity sessionId={sId} />
    ))
    .with({ type: ExtendedEntitiesTypeDict.ExperimentalBoutonDensity }, () => (
      <ExperimentalBoutonDensity sessionId={sId} />
    ))
    .with({ type: ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection }, () => (
      <ExperimentalSynapsesPerConnection sessionId={sId} />
    ))
    .with({ type: ExtendedEntitiesTypeDict.EMCellMesh }, () => <EMCellMesh sessionId={sId} />)
    .otherwise(() => null);

  return (
    <div className="flex flex-col w-full h-full px-5">
      <div className="flex w-full items-center justify-between gap-2 mt-5 mb-3">
        <h3 className="text-primary-9 text-2xl font-bold">{title}</h3>
        <Button
          variant="icon"
          className="text-primary-9 hover:text-primary-6 hover:bg-background ml-auto size-8 bg-white text-lg"
          onClick={onClose}
        >
          <CloseOutlined />
        </Button>
      </div>
      {content}
    </div>
  );
}

function RenderImportEntityTypeContent({
  title,
  type,
  sessionId: sId,
  onClose,
}: IRenderEntityTypeContentProps) {
  return match({ type })
    .with(
      {
        type: ExtendedEntitiesTypeDict.CellMorphology,
      },
      () => <CellMorphologyImport title={title} sessionId={sId} onClose={onClose} />
    )
    .with(
      {
        type: ExtendedEntitiesTypeDict.ElectricalCellRecording,
      },
      () => <ElectricalCellRecordingImport title={title} sessionId={sId} onClose={onClose} />
    )
    .otherwise(() => null);
}

export function ContributionModal() {
  const [{ entityType, entryMode, sessionId, display }, setEventPayload] = useState<{
    display: boolean;
    entityType: TExtendedEntitiesTypeDict | null;
    entryMode: TContributionEntryMode | null;
    sessionId: string | null;
  }>({
    display: false,
    entityType: null,
    entryMode: null,
    sessionId: null,
  });

  const onSelectEntityType = ({
    type,
    mode,
  }: {
    type: TExtendedEntitiesTypeDict;
    mode: TContributionEntryMode;
  }): void => {
    setEventPayload({ sessionId, display, entityType: type, entryMode: mode });
  };

  const onClose = (): void => {
    makeSelectContributionEntityClickEvent({ display: false, entityType: null, sessionId: null });
  };

  useContributionEntityClickEvent(({ detail }) => {
    setEventPayload({
      ...detail,
      entryMode: detail.entityType ? ContributionEntryMode.Legacy : null,
    });
  });

  const entity = getEntityByExtendedType({ type: entityType ?? undefined });
  const title = match({ entityType, entryMode, entity })
    .with({ entityType: P.union(P.nullish, P._), entity: P.nullish }, () => 'Add new artifact')
    .with(
      {
        entryMode: ContributionEntryMode.Import,
        entityType: P.string.select('type'),
        entity: P.not(P.nullish).select('entity'),
      },
      ({ entity: et }) => `Import ${et.title ?? 'artifact'} from CSV`
    )
    .with(
      {
        entryMode: ContributionEntryMode.Legacy,
        entityType: P.string.select('type'),
        entity: P.not(P.nullish).select('entity'),
      },
      ({ entity: et }) => `Add new ${et.title ?? 'artifact'}`
    )
    .otherwise(() => null);

  const content = match({ entityType, entryMode, sessionId, entity })
    .with({ entityType: P.nullish }, () => (
      <ExtendedEntitiesSelector onSelectEntityType={onSelectEntityType} />
    ))
    .with(
      {
        sessionId: P.string.select('sId'),
        entryMode: ContributionEntryMode.Legacy,
        entityType: P.string.select('type'),
      },
      ({ sId, type }) => {
        return (
          <RenderLegacyEntityTypeContent
            title={title}
            onClose={onClose}
            type={type}
            sessionId={sId}
          />
        );
      }
    )
    .with(
      {
        sessionId: P.string.select('sId'),
        entryMode: ContributionEntryMode.Import,
        entityType: P.string.select('type'),
      },
      ({ sId, type }) => {
        return (
          <RenderImportEntityTypeContent
            onClose={onClose}
            title={title}
            type={type}
            sessionId={sId}
          />
        );
      }
    )
    .otherwise(() => null);

  if (isNil(sessionId)) return null;

  return (
    <Modal
      open={display}
      size={entryMode === ContributionEntryMode.Legacy ? undefined : 'full'}
      position="center"
      className={cn(
        entryMode === ContributionEntryMode.Import
          ? 'h-screen w-screen rounded-none'
          : 'h-full max-h-[calc(100vh-6rem)] min-h-100 w-200 rounded-2xl'
      )}
      bodyClassName={cn(
        entryMode === ContributionEntryMode.Import
          ? 'h-full w-full max-h-full'
          : 'flex flex-col h-full min-h-0 max-h-full overflow-hidden p-0 relative'
      )}
      overlayClassName="bg-primary-9/80 backdrop-blur-sm!"
      headerClassName={cn('w-full rounded-t-2xl pb-2', '[&_#modal-title]:w-full')}
      onClose={onClose}
      closable={false}
      title={
        !entryMode && (
          <div className="flex w-full items-center justify-between gap-2 mb-10">
            <h3 className="text-primary-9 text-2xl font-bold">{title}</h3>
            <Button
              rounded
              variant="icon"
              className="text-primary-9 hover:text-primary-6 hover:bg-background ml-auto size-8 bg-white text-lg"
              onClick={onClose}
            >
              <CloseOutlined />
            </Button>
          </div>
        )
      }
    >
      {content}
    </Modal>
  );
}
