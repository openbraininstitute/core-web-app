'use client';

import { useRouter } from '@bprogress/next';
import { useQueryClient } from '@tanstack/react-query';
import { use, useEffect } from 'react';

import { fetchObiOneOpenApi } from '@/features/scan-config/components/hooks/schema';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useDisableElementOverflow } from '@/ui/hooks/use-disable-element-overflow';
import { useNextStepOnboarding, workflowTour } from '@/ui/segments/app-setup/discover-app';
import {
  buildWorkflowStartingPageUrl,
  inferWorkflowStartingPageRemoteSchemaBased,
} from '@/ui/segments/workflows/config';
import { WorkflowActivity } from '@/ui/segments/workflows/elements/workflow-activity';
import { WorkflowHexMenu } from '@/ui/segments/workflows/elements/workflow-hex-menu';
import { WorkflowMenuMobile } from '@/ui/segments/workflows/elements/workflow-menu-mobile';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { ServerSideComponentProp, WorkspaceContext } from '@/types/common';
import type { TActivityValue } from '@/ui/segments/workflows/config';

/**
 * The workflows: their categories as hexagons down the left under "Start a new workflow", each type on its
 * tongue starting its workflow, and the project's workflows beside them under "Project workflows", in a white
 * card as the Data table is.
 */
export default function Page({ params }: ServerSideComponentProp<WorkspaceContext, null>) {
  useDisableElementOverflow({ id: 'workspace-body' });
  useNextStepOnboarding({ condition: true, tour: workflowTour });

  const { virtualLabId, projectId } = use(params);
  const { push: navigate } = useRouter();
  const queryClient = useQueryClient();

  const onSelectType = async (activity: TActivityValue, value: TExtendedEntitiesTypeDict) => {
    const { stage, workflow, schemaSelection } = await inferWorkflowStartingPageRemoteSchemaBased({
      qc: queryClient,
      activity,
      targetType: value,
    });

    navigate(
      buildWorkflowStartingPageUrl({
        activity,
        targetType: value,
        workspace: { virtualLabId, projectId },
        stage,
        workflow,
        schemaSelection,
      })
    );
  };

  // what starting any type needs (obi-one's schemas), fetched as the page opens, and the type's own while it is
  // hovered, so a click goes at once
  useEffect(() => {
    fetchObiOneOpenApi().catch(() => {});
  }, []);
  const onPrepareType = (activity: TActivityValue, value: TExtendedEntitiesTypeDict) => {
    inferWorkflowStartingPageRemoteSchemaBased({ qc: queryClient, activity, targetType: value }).catch(
      () => {}
    );
  };

  const table = (
    <div id="workflow-activity-content" data-testid="workflow-activity-content" className="flex h-full min-h-0 flex-col">
      <WorkflowActivity framed />
    </div>
  );
  // a phone has no room for the hexagons' tongues, nor a pointer to hover with: the page down its length instead
  const phone = useMediaQuery('(max-width: 767px)', false);

  return (
    // its foot where the page had it before the hexagons: 6rem short of the window's height
    <div className="h-full max-h-[calc(100vh-6rem)] px-3 pt-3 max-md:max-h-none max-md:px-2 max-md:pt-2">
      {phone ? (
        <WorkflowMenuMobile onSelectType={onSelectType}>{table}</WorkflowMenuMobile>
      ) : (
        <WorkflowHexMenu onSelectType={onSelectType} onPrepareType={onPrepareType}>
          {table}
        </WorkflowHexMenu>
      )}
    </div>
  );
}
