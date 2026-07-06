'use client';

import { isNil } from 'es-toolkit/compat';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceSection } from '@/constants';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { useDisableElementOverflow } from '@/ui/hooks/use-disable-element-overflow';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { useMiniDetailView, useSelectEntityClickEvent } from '@/ui/segments/mini-detail-view/event';
import { useBuildSingleNeuronSynaptomeSessionState } from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';
import { cn } from '@/utils/css-class';
import { resolveExploreDetailsPageUrl } from '@/utils/url-builder';

import type { IMEModel } from '@/api/entitycore/types';

type Props = {
  sessionId: string;
};

export function MEModel({ sessionId }: Props) {
  const { mdv, setMdv } = useMiniDetailView();
  const { virtualLabId, projectId } = useWorkspace();
  const { push: navigate } = useRouter();
  useDisableElementOverflow({ id: 'workspace-body' });
  useSelectEntityClickEvent((ev) => {
    setMdv(ev.detail.display);
  });

  const { setSessionValue, sessionValue } = useBuildSingleNeuronSynaptomeSessionState({
    sessionId,
  });

  return (
    <motion.div
      id="workflow-new-inner-layout"
      className={cn(
        'grid gap-4 [grid-area:body]',
        'h-full max-h-full px-3 py-2',
        { "grid-cols-1 [grid-template-areas:'body']": !mdv },
        { "grid-cols-[3fr_2fr] [grid-template-areas:'body_mini-view']": mdv }
      )}
      initial={false}
      animate={{
        gridTemplateColumns: mdv ? '3fr 2fr' : '1fr',
        gridTemplateAreas: mdv ? "'body mini-view'" : "'body'",
      }}
      transition={{
        type: 'spring',
        stiffness: 320,
        damping: 30,
        mass: 0.6,
      }}
      style={{ willChange: 'grid-template-columns, grid-template-areas' }}
    >
      <BrowseEntityScope
        requireBrainRegion
        requireScopeSelector
        requireSpeciesSelector
        allowDownload={false}
        allowDelete={false}
        id={sessionId}
        requireMiniDetailView={false}
        section={WorkspaceSection.BuildWorkflow}
        classNames={{ container: 'max-h-full' }}
        dataType={ExtendedEntitiesTypeDict.Memodel}
        miniViewProps={{ section: WorkspaceSection.BuildWorkflow }}
        mainTableProps={{
          selectionType: 'radio',
          onCellClick: (_, record) => {
            navigate(
              `${resolveExploreDetailsPageUrl({
                ctx: { virtualLabId, projectId },
                entityId: record.id,
                dataType: ExtendedEntitiesTypeDict.Memodel,
              })}/overview`
            );
          },
          onRowsSelected: (rows) => {
            const record = rows.at(0);
            if (record) {
              if (!isNil(sessionValue?.memodel)) {
                setSessionValue({
                  ...sessionValue,
                  seed: sessionValue?.seed ?? 100,
                  memodel: record as unknown as IMEModel,
                  synapseSets: new Map(),
                  synapseCount: new Map(),
                });
              } else {
                setSessionValue({
                  ...sessionValue,
                  seed: sessionValue?.seed ?? 100,
                  memodel: record as unknown as IMEModel,
                });
              }
            }
          },
        }}
      />
    </motion.div>
  );
}
