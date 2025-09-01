'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { useState } from 'react';

import { useBuildSingleNeuronSynaptomeSessionState } from '@/ui/segments/workflows/build/single-neuron-synaptome/helpers';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { useDisableElementOverflow } from '@/ui/hooks/use-disable-element-overflow';
import { useSelectEntityClickEvent } from '@/ui/segments/mini-detail-view/event';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { V2_MIGRATION_TEMPORARY_BASE_PATH } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { cn } from '@/utils/css-class';

import type { IMEModel } from '@/api/entitycore/types';

type Props = {
  sessionId: string;
};

export function MEModel({ sessionId }: Props) {
  const [miniViewPresent, setMiniViewPresent] = useState(false);
  const { virtualLabId, projectId } = useWorkspace();
  const { push: navigate } = useRouter();
  useDisableElementOverflow({ id: 'workspace-body' });
  useSelectEntityClickEvent((ev) => {
    setMiniViewPresent(ev.detail.display);
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
        { "grid-cols-1 [grid-template-areas:'body']": !miniViewPresent },
        { "grid-cols-[3fr_2fr] [grid-template-areas:'body_mini-view']": miniViewPresent }
      )}
      initial={false}
      animate={{
        gridTemplateColumns: miniViewPresent ? '3fr 2fr' : '1fr',
        gridTemplateAreas: miniViewPresent ? "'body mini-view'" : "'body'",
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
        id={sessionId}
        requireMiniDetailView={false}
        section={WorkspaceSection.BuildWorkflow}
        classNames={{ container: 'max-h-full' }}
        dataType={ExtendedEntitiesTypeDict.Memodel}
        scope={WorkspaceScope.BuildSynaptomeModel}
        miniViewProps={{ section: WorkspaceSection.BuildWorkflow }}
        mainTableProps={{
          selectionType: 'radio',
          onCellClick: (_, record) => {
            navigate(
              `${V2_MIGRATION_TEMPORARY_BASE_PATH}/${virtualLabId}/${projectId}/explore/view/${record.id}`
            );
          },
          onRowsSelected: (rows) => {
            const record = rows.at(0);
            setSessionValue({
              ...sessionValue,
              seed: sessionValue?.seed ?? 100,
              memodel: record as unknown as IMEModel,
            });
          },
        }}
      />
    </motion.div>
  );
}
