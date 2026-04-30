'use client';

import { CloseOutlined } from '@ant-design/icons';
import { Image } from 'antd';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { match, P } from 'ts-pattern';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { WorkspaceSection } from '@/constants';
import { getFieldDefinition } from '@/entity-configuration/definitions';
import { renderPreview } from '@/entity-configuration/definitions/renderer';
import { getViewDefinitionByExtendedType } from '@/entity-configuration/definitions/view-defs';
import { Card, CardTitle } from '@/ui/molecules/card';
import { ExpandableText } from '@/ui/molecules/more-less-text';
import {
  makeSelectEntityClickEvent,
  useMiniDetailView,
  useSelectEntityClickEvent,
} from '@/ui/segments/mini-detail-view/event';
import { CircuitPreview } from '@/ui/segments/mini-detail-view/previews/circuit-preview';
import { MEModelPreview } from '@/ui/segments/mini-detail-view/previews/me-model-preview';
import { SingleNeuronSimulationPreview } from '@/ui/segments/mini-detail-view/previews/single-neuron-simulation-preview';
import { SingleNeuronSynaptomePreview } from '@/ui/segments/mini-detail-view/previews/single-neuron-synaptome-preview';
import { cn } from '@/utils/css-class';

import { DataActions, WorkflowActions, WorkflowBuildActions } from './actions';

import type {
  EntityCoreObjectTypes,
  IMEModel,
  ISingleNeuronSimulation,
  ISingleNeuronSynaptome,
  ISingleNeuronSynaptomeSimulation,
} from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreResource } from '@/api/entitycore/types/shared/global';
import type { TWorkspaceSection } from '@/constants';
import type { TMiniDetailViewTheme } from '@/ui/segments/mini-detail-view/types';

type Props = {
  section?: TWorkspaceSection;
  dataType: TExtendedEntitiesTypeDict;
};

export function MiniDetailView<T extends EntityCoreObjectTypes>({
  section = WorkspaceSection.Data,
  dataType,
}: Props) {
  const [record, setRecord] = useState<T | null>(null);
  const { mdv, setMdv } = useMiniDetailView();

  useSelectEntityClickEvent<T>((event) => {
    setRecord(event.detail.data);
  });

  useEffect(() => {
    if (!mdv && record) {
      setRecord(null);
    }
  }, [mdv, record]);

  const onClose = () => {
    setMdv(false);
    setRecord(null);
    makeSelectEntityClickEvent({ data: null, display: false });
  };

  useEffect(() => {
    return () => {
      setMdv(false);
    };
  }, [setMdv]);

  return (
    <MiniDetailViewRenderer
      section={section}
      record={record}
      dataType={dataType}
      onClose={onClose}
    />
  );
}

export function MiniDetailViewRenderer<T extends EntityCoreObjectTypes>({
  section,
  record,
  dataType,
  onClose,
  theme = 'default',
  enableAnimation = true,
}: {
  section: TWorkspaceSection;
  record: T | null;
  dataType: TExtendedEntitiesTypeDict;
  onClose?: () => void;
  theme?: TMiniDetailViewTheme;
  enableAnimation?: boolean;
}) {
  if (!record) return null;
  const viewConfig = getViewDefinitionByExtendedType(dataType ?? record.type);
  const miniConfig = viewConfig?.miniDetailView;

  const preview = match({ type: record.type })
    .with({ type: P.nullish }, () => null)
    .with(
      {
        type: P.union(
          ExtendedEntitiesTypeDict.ExperimentalBoutonDensity,
          ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection,
          ExtendedEntitiesTypeDict.ExperimentalNeuronDensity
        ),
      },
      () => null
    )
    .with(
      {
        type: P.union(
          ExtendedEntitiesTypeDict.CellMorphology,
          ExtendedEntitiesTypeDict.ElectricalCellRecording,
          ExtendedEntitiesTypeDict.IonChannelRecording,
          ExtendedEntitiesTypeDict.Emodel
        ),
      },
      () => {
        return (
          <div
            className="mt-5 flex w-full items-center justify-center rounded-md bg-white"
            key={record.id}
          >
            {renderPreview(
              record as unknown as EntityCoreResource,
              undefined,
              undefined,
              'rounded-md h-full relative w-full!',
              'w-full! h-[200px]! flex!',
              true,
              (src) => (
                <Image
                  alt={`${record.name} preview`}
                  src={src}
                  rootClassName=" w-full  h-80"
                  className="max-h-full w-full rounded-md object-contain"
                />
              )
            )}
          </div>
        );
      }
    )
    .with(
      {
        type: P.union(ExtendedEntitiesTypeDict.IonChannelModel),
      },
      () => {
        return (
          <div
            className="mt-5 flex w-full items-center justify-center rounded-md bg-white"
            key={record.id}
          >
            {renderPreview(
              record as unknown as EntityCoreResource,
              undefined,
              undefined,
              'rounded-md h-full relative w-full!',
              'w-full! h-[200px]! flex!',
              true,
              (src) => (
                <Image
                  alt={`${record.name} preview`}
                  src={src}
                  rootClassName=" w-full  h-80"
                  className="max-h-full w-full rounded-md object-contain"
                />
              ),
              'assetLabel',
              AssetLabel.ion_channel_model_thumbnail
            )}
          </div>
        );
      }
    )
    .with(
      {
        type: ExtendedEntitiesTypeDict.Memodel,
      },
      () => {
        return (
          <div className="mt-5 w-full" key={record.id}>
            <MEModelPreview record={record as IMEModel} />
          </div>
        );
      }
    )
    .with(
      {
        type: ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
      },
      () => (
        <div className="mt-5 w-full" key={record.id}>
          <SingleNeuronSynaptomePreview record={record as ISingleNeuronSynaptome} />
        </div>
      )
    )
    .with(
      {
        type: P.union(
          ExtendedEntitiesTypeDict.SingleNeuronSimulation,
          ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation
        ),
      },
      () => (
        <div className="mt-5 w-full" key={record.id}>
          <SingleNeuronSimulationPreview
            record={record as ISingleNeuronSimulation | ISingleNeuronSynaptomeSimulation}
          />
        </div>
      )
    )
    .with(
      {
        type: ExtendedEntitiesTypeDict.Circuit,
      },
      () => {
        return (
          <div className="mt-5 w-full" key={record.id}>
            <CircuitPreview record={record as ICircuit} />
          </div>
        );
      }
    )
    .otherwise(() => null);

  const actions = match({ section })
    .with({ section: WorkspaceSection.Data }, () => (
      <DataActions record={record} dataType={dataType} theme={theme} />
    ))
    .with(
      {
        section: P.union(
          WorkspaceSection.SimulateWorkflow,
          WorkspaceSection.ExtractWorkflow,
          WorkspaceSection.ProcessWorkflow
        ),
      },
      ({ section }) => <WorkflowActions record={record} dataType={dataType} section={section} />
    )
    .with({ section: WorkspaceSection.BuildWorkflow }, () => (
      <WorkflowBuildActions record={record} dataType={dataType} />
    ))
    .otherwise(() => null);

  return (
    <AnimatePresence>
      {record && (
        <motion.div
          key="mini-detail-view"
          initial={enableAnimation ? { x: 300, opacity: 0 } : undefined}
          animate={enableAnimation ? { x: 0, opacity: 1 } : undefined}
          exit={enableAnimation ? { x: 300, opacity: 0 } : undefined}
          transition={
            enableAnimation
              ? {
                  type: 'spring',
                  stiffness: 320,
                  damping: 33,
                  mass: 0.9,
                  opacity: { duration: 0.2 },
                }
              : undefined
          }
          style={{ willChange: 'transform, opacity' }}
          className="h-full"
        >
          <Card
            id="mini-viewer"
            data-testid="mini-viewer"
            className={cn(
              'bg-primary-9 relative h-full gap-0.5 rounded-2xl py-0 pr-1 pl-2 text-white',
              {
                'bg-white text-primary-9': theme === 'light',
              }
            )}
          >
            <CardTitle
              className={cn(
                'bg-primary-9 sticky top-0 flex items-start justify-between gap-4 rounded-2xl px-5 pt-4 pb-2',
                {
                  'bg-white text-primary-9': theme === 'light',
                }
              )}
            >
              <h1 className="text-2xl font-bold break-all" title={record.name}>
                {record.name}
              </h1>
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-1.5 rounded-md p-2 hover:bg-white/20"
                >
                  <CloseOutlined className="text-white" />
                </button>
              )}
            </CardTitle>
            <div
              className={cn('primary-scrollbar h-[calc(100%-90px)] w-full overflow-auto px-5', {
                'bg-white text-primary-9 secondary-scrollbar': theme === 'light',
              })}
            >
              {record.description && (
                <ExpandableText
                  id="record-description"
                  text={record.description}
                  collapsedLines={2}
                  className={cn(
                    'text-primary-3 text-base leading-6 transition-all duration-300 lg:text-lg',
                    {
                      'text-gray-800': theme === 'light',
                    }
                  )}
                  btnWrapperClassName="mb-2 mt-0"
                >
                  {({ isExpanded, toggle }) => (
                    <button
                      type="button"
                      onClick={toggle}
                      className={cn(
                        'text-white/90 underline decoration-white/40 underline-offset-4 transition-colors hover:text-white',
                        'text-xs',
                        {
                          'text-gray-800': theme === 'light',
                        }
                      )}
                    >
                      {isExpanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </ExpandableText>
              )}
              {preview ?? (
                <div
                  className={cn('bg-primary-3 my-4 h-px w-full', {
                    'bg-gray-400': theme === 'light',
                  })}
                />
              )}
              <div className="mb-5 grid grid-flow-row-dense grid-cols-2 items-start justify-between gap-2 pt-4">
                {miniConfig?.map((o) => {
                  const field = getFieldDefinition(o.field);
                  return (
                    <div
                      key={o.field}
                      className={cn(
                        'flex flex-col items-baseline justify-start gap-1',
                        o.className
                      )}
                    >
                      <div
                        className={cn('text-primary-3 text-base font-light', {
                          'text-label': theme === 'light',
                        })}
                      >
                        {field?.title}
                      </div>
                      <div
                        className={cn('max-w-full text-base font-bold wrap-break-word text-white', {
                          'text-primary-8': theme === 'light',
                        })}
                      >
                        {field?.render?.(record)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {actions}
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MiniDetailView;
