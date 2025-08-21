import { CheckCircleFilled, CloseOutlined, CopyOutlined, LoadingOutlined } from '@ant-design/icons';
import { AnimatePresence, motion } from 'motion/react';
import { useMutation } from '@tanstack/react-query';
import { match, P } from 'ts-pattern';
import { useState } from 'react';
import { Image } from 'antd';

import kebabCase from 'lodash/kebabCase';
import Link from 'next/link';

import { SingleNeuronSynaptomePreview } from '@/ui/segments/mini-detail-view/previews/single-neuron-synaptome-preview';
import { getViewDefinitionByExtendedType } from '@/entity-configuration/definitions/view-defs';
import { MEModelPreview } from '@/ui/segments/mini-detail-view/previews/me-model-preview';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { bookmarkToProjectLibrary } from '@/api/virtual-lab-svc/queries/bookmark';
import { renderPreview } from '@/entity-configuration/definitions/renderer';
import { getFieldDefinition } from '@/entity-configuration/definitions';
import { BookmarkIcon, DownloadIcon } from '@/components/icons/buttons';
import { useCopyToClipboard } from '@/hooks/useCopyClipboard';
import { downloadArchive } from '@/services/entity-download';
import { V2_MIGRATION_TEMPORARY_BASE_PATH } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Card, CardTitle } from '@/ui/molecules/card';
import { Button } from '@/ui/molecules/button';
import {
  makeSelectEntityClickEvent,
  useSelectEntityClickEvent,
} from '@/ui/segments/mini-detail-view/event';
import { cn } from '@/utils/css-class';

import type { EntityCoreResource } from '@/api/entitycore/types/shared/global';
import type {
  EntityCoreObjectTypes,
  IMEModel,
  ISingleNeuronSynaptome,
} from '@/api/entitycore/types';
import { ExpandableText } from '@/ui/molecules/more-less-text';

export function MiniDetailView<T extends EntityCoreObjectTypes>() {
  const [record, setRecord] = useState<T | null>(null);
  useSelectEntityClickEvent<T>((event) => {
    setRecord(event.detail.data);
  });

  const onClose = () => {
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
          ExtendedEntitiesTypeDict.ReconstructionMorphology,
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
          <div className="mt-5 w-full">
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
        <div className="mt-5 w-full">
          <SingleNeuronSynaptomePreview record={record as ISingleNeuronSynaptome} />
        </div>
      )
    )
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
              <h1 className="text-2xl font-bold">{record.name}</h1>
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
            <Actions record={record} />
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default MiniDetailView;

function Actions<T extends EntityCoreObjectTypes>({ record }: { record: T }) {
  const { virtualLabId, projectId } = useWorkspace();
  const [, copy, , copying] = useCopyToClipboard();
  const onCopyClipboard = () => copy(record.id);

  const { isPending: pendingSave, mutateAsync: saveAsync } = useMutation({
    mutationFn: () =>
      bookmarkToProjectLibrary(
        {
          virtualLabId,
          projectId,
        },
        { entity_id: record.id, category: record.type }
      ),
  });

  const { isPending: pendingDownload, mutateAsync: downloadAsync } = useMutation({
    mutationFn: () => downloadArchive(record.type, [record.id]),
  });

  const onBookmark = () => saveAsync();
  const onDownload = () => downloadAsync();

  return (
    <div className="sticky bottom-0 mt-auto flex items-center justify-center gap-2 self-end p-4">
      <Button
        rounded
        title="copy ID"
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
      <Button
        rounded
        title="save to bookmark"
        className="hover:bg-primary-7/40 h-12 w-12 border border-white/16 shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]"
        onClick={onBookmark}
      >
        {pendingSave ? <LoadingOutlined spin className="text-primary-3" /> : <BookmarkIcon />}
      </Button>
      <Button
        rounded
        title="download"
        className="hover:bg-primary-7/40 h-12 w-12 border border-white/16 shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]"
        onClick={onDownload}
      >
        {pendingDownload ? <LoadingOutlined spin className="text-primary-3" /> : <DownloadIcon />}
      </Button>
      <Button
        rounded
        asChild
        title="go to details page"
        variant="default"
        className="hover:bg-primary-7/40 h-12 border border-white/16 px-10 font-bold shadow-[8px_8px_20px_0px_#0000005C,-12px_-8px_32px_0px_#FFFFFF1F]"
      >
        <Link
          href={`${V2_MIGRATION_TEMPORARY_BASE_PATH}/${virtualLabId}/${projectId}/explore/view/${kebabCase(record.type)}/${record.id}`}
        >
          View details
        </Link>
      </Button>
    </div>
  );
}
