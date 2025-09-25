import { CheckCircleFilled, CloseOutlined, CopyOutlined, LoadingOutlined } from '@ant-design/icons';
import { AnimatePresence, motion } from 'motion/react';
import { useMutation } from '@tanstack/react-query';
import { match, P } from 'ts-pattern';
import { useState, useEffect } from 'react';
import { Image } from 'antd';
import { useAtom } from 'jotai';

import kebabCase from 'lodash/kebabCase';
import Link from 'next/link';
import { CircuitPreview } from './previews/circuit-preview';
import { downloadPanelCircuitAtom } from '@/ui/segments/explore/circuit/elements/download-panel';

import { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { SingleNeuronSimulationPreview } from '@/ui/segments/mini-detail-view/previews/single-neuron-simulation-preview';
import { SingleNeuronSynaptomePreview } from '@/ui/segments/mini-detail-view/previews/single-neuron-synaptome-preview';
import { getViewDefinitionByExtendedType } from '@/entity-configuration/definitions/view-defs';
import { MEModelPreview } from '@/ui/segments/mini-detail-view/previews/me-model-preview';
import {
  ExtendedEntitiesTypeDict,
  TExtendedEntitiesTypeDict,
} from '@/api/entitycore/types/extended-entity-type';
import { renderPreview } from '@/entity-configuration/definitions/renderer';
import { getFieldDefinition } from '@/entity-configuration/definitions';
import { DownloadIcon } from '@/components/icons/buttons';
import { ExpandableText } from '@/ui/molecules/more-less-text';
import { useCopyToClipboard } from '@/hooks/useCopyClipboard';
import { downloadArchive } from '@/services/entity-download';
import { ROOT_ROUTE } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Card, CardTitle } from '@/ui/molecules/card';
import { WorkspaceSection } from '@/constants';
import { Button } from '@/ui/molecules/button';
import {
  makeSelectEntityClickEvent,
  useSelectEntityClickEvent,
  useMiniDetailView,
} from '@/ui/segments/mini-detail-view/event';
import { cn } from '@/utils/css-class';

import type { EntityCoreResource } from '@/api/entitycore/types/shared/global';
import type { TWorkspaceSection } from '@/constants';
import {
  EntityTypeDict,
  type EntityCoreObjectTypes,
  type IMEModel,
  type ISingleNeuronSimulation,
  type ISingleNeuronSynaptome,
  type ISingleNeuronSynaptomeSimulation,
} from '@/api/entitycore/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';

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

  // Reset record when mdv becomes false
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

  if (!record) return null;

  const viewConfig = getViewDefinitionByExtendedType(record.type);
  const miniConfig = viewConfig?.miniDetailView;

  const preview = match({ type: record.type })
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
      <ExploreActions record={record} dataType={dataType} />
    ))
    .with({ section: WorkspaceSection.SimulateWorkflow }, () => (
      <WorkflowSimulateActions record={record} />
    ))
    .with({ section: WorkspaceSection.BuildWorkflow }, () => (
      <WorkflowBuildActions record={record} />
    ))
    .otherwise(() => null);

  return (
    <AnimatePresence>
      {record && (
        <motion.div
          key="mini-detail-view"
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{
            type: 'spring',
            stiffness: 320,
            damping: 33,
            mass: 0.9,
            opacity: { duration: 0.2 },
          }}
          style={{ willChange: 'transform, opacity' }}
          className="h-full"
        >
          <Card
            id="mini-viewer"
            data-testid="mini-viewer"
            className="bg-primary-9 relative h-full gap-0.5 rounded-2xl py-0 pr-1 pl-2 text-white"
          >
            <CardTitle className="bg-primary-9 sticky top-0 flex items-start justify-between gap-4 rounded-2xl px-5 pt-4 pb-2">
              <h1 className="text-2xl font-bold break-all" title={record.name}>
                {record.name}
              </h1>
              <button
                type="button"
                onClick={onClose}
                className="mt-1.5 rounded-md p-2 hover:bg-white/20"
              >
                <CloseOutlined className="text-white" />
              </button>
            </CardTitle>
            <div className="primary-scrollbar h-[calc(100%-90px)] w-full overflow-auto px-5">
              {record.description && (
                <ExpandableText
                  id="record-description"
                  text={record.description}
                  collapsedLines={2}
                  className="text-primary-3 text-base leading-6 transition-all duration-300 lg:text-lg"
                  btnWrapperClassName="mb-2 mt-0"
                >
                  {({ isExpanded, toggle }) => (
                    <button
                      type="button"
                      onClick={toggle}
                      className={cn(
                        'text-white/90 underline decoration-white/40 underline-offset-4 transition-colors hover:text-white',
                        'text-xs'
                      )}
                    >
                      {isExpanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </ExpandableText>
              )}
              {preview ?? <div className="bg-primary-3 my-4 h-px w-full" />}
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
                      <div className="text-primary-3 text-base font-light">{field?.title}</div>
                      <div className="max-w-full text-base font-bold break-words text-white">
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

function ExploreActions<T extends EntityCoreObjectTypes>({
  record,
  dataType,
}: {
  record: T;
  dataType?: TExtendedEntitiesTypeDict;
}) {
  const { virtualLabId, projectId } = useWorkspace();
  const [, copy, , copying] = useCopyToClipboard();
  const onCopyClipboard = () => copy(record.id);

  // const { mutateAsync: saveAsync } = useMutation({
  //   mutationFn: () =>
  //     bookmarkToProjectLibrary(
  //       {
  //         virtualLabId,
  //         projectId,
  //       },
  //       { entity_id: record.id, category: record.type }
  //     ),
  // });

  const { isPending: pendingDownload, mutateAsync: downloadAsync } = useMutation({
    mutationFn: () => downloadArchive(record.type, [record.id], { virtualLabId, projectId }),
  });

  const [, setDownloadPanelCircuit] = useAtom(downloadPanelCircuitAtom);

  // const onBookmark = () => saveAsync();
  const onDownload = () => {
    if (EntityTypeDict.Circuit === record.type) {
      setDownloadPanelCircuit(record as ICircuit);
    } else {
      downloadAsync();
    }
  };

  return (
    <div className="sticky bottom-0 mt-auto flex items-center justify-center gap-2 self-end p-4">
      <Tooltip>
        <TooltipTrigger>
          <Button
            rounded
            title="Copy ID"
            className="hover:bg-primary-7/40 h-12 w-12 border border-white/16 shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]"
            onClick={onCopyClipboard}
          >
            {copying ? (
              <motion.div
                key="checkmark"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 500,
                  damping: 30,
                  duration: 0.2,
                }}
              >
                <CheckCircleFilled className="text-accent-light" />
              </motion.div>
            ) : (
              <div key="copy">
                <CopyOutlined />
              </div>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent
          avoidCollisions
          side="top"
          sideOffset={3}
          align="center"
          className="text-primary-8 bg-white"
          arrowClassName="bg-white"
        >
          <span>Copy ID</span>
        </TooltipContent>
      </Tooltip>
      {/* <Tooltip>
        <TooltipTrigger>
          <Button
            rounded
            title="Save to bookmark"
            className="hover:bg-primary-7/40 h-12 w-12 border border-white/16 shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]"
            onClick={onBookmark}
          >
            {pendingSave ? <LoadingOutlined spin className="text-primary-3" /> : <BookmarkIcon />}
          </Button>
        </TooltipTrigger>
        <TooltipContent
          avoidCollisions
          side="top"
          sideOffset={3}
          align="center"
          className="text-primary-8 bg-white"
          arrowClassName="bg-white"
        >
          <span>Save to bookmark</span>
        </TooltipContent>
      </Tooltip> */}
      <Tooltip>
        <TooltipTrigger>
          <Button
            rounded
            title="download"
            className="hover:bg-primary-7/40 h-12 w-12 border border-white/16 shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]"
            onClick={onDownload}
          >
            {pendingDownload ? (
              <LoadingOutlined spin className="text-primary-3" />
            ) : (
              <DownloadIcon />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent
          avoidCollisions
          side="top"
          sideOffset={3}
          align="center"
          className="text-primary-8 bg-white"
          arrowClassName="bg-white"
        >
          <span>Download</span>
        </TooltipContent>
      </Tooltip>

      <Button
        rounded
        asChild
        title="Go to details page"
        variant="default"
        className="hover:bg-primary-7/40 h-12 border border-white/16 px-10 font-bold shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]"
      >
        <Link
          href={`${ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${kebabCase(dataType)}/${record.id}`}
        >
          View details
        </Link>
      </Button>
    </div>
  );
}

function WorkflowSimulateActions<T extends EntityCoreObjectTypes>({ record }: { record: T }) {
  const { virtualLabId, projectId } = useWorkspace();

  return (
    <div className="sticky bottom-0 mt-auto flex items-center justify-center gap-2 self-end p-4">
      <Button
        rounded
        asChild
        title="Go to details page"
        variant="default"
        className="hover:bg-primary-7/40 h-12 border border-white/16 px-10 font-bold shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]"
      >
        <Link
          href={`${ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${kebabCase(record.type)}/${record.id}`}
        >
          View details
        </Link>
      </Button>
      <Button
        rounded
        asChild
        title="Start simulation"
        variant="default"
        className="hover:bg-primary-7/40 h-12 border border-white/16 px-10 font-bold shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]"
      >
        <Link
          href={{
            pathname: `${ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/simulate/configure/${kebabCase(record.type)}/${record.id}`,
            query: { sessionId: crypto.randomUUID() },
          }}
        >
          Use model
        </Link>
      </Button>
    </div>
  );
}

function WorkflowBuildActions<T extends EntityCoreObjectTypes>({ record }: { record: T }) {
  const { virtualLabId, projectId } = useWorkspace();
  const onWorkflowClick = () => {};

  return (
    <div className="sticky bottom-0 mt-auto flex items-center justify-center gap-2 self-end p-4">
      <Button
        rounded
        asChild
        title="Go to details page"
        variant="default"
        className="hover:bg-primary-7/40 h-12 border border-white/16 px-10 font-bold shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]"
      >
        <Link
          href={`${ROOT_ROUTE}/${virtualLabId}/${projectId}/data/view/${kebabCase(record.type)}/${record.id}`}
        >
          View details
        </Link>
      </Button>
      <Button
        rounded
        asChild
        title="Start build"
        variant="default"
        className="hover:bg-primary-7/40 h-12 border border-white/16 px-10 font-bold shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]"
      >
        <Link
          href={{
            pathname: `${ROOT_ROUTE}/${virtualLabId}/${projectId}/workflows/build/configure/${kebabCase(record.type)}/${record.id}`,
            query: { sessionId: crypto.randomUUID() },
          }}
          onClick={onWorkflowClick}
        >
          Use model
        </Link>
      </Button>
    </div>
  );
}
