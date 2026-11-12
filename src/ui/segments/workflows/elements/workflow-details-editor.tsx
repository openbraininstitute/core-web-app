'use client';

import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { invalidateEntityListings } from '@/features/data-grid/listing-queries';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { WorkflowDetailsDialog } from '@/ui/segments/workflows/elements/workflow-details-dialog';
import { keyBuilder } from '@/ui/use-query-keys/data';

import type { ReactNode } from 'react';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

/** Head of every workflow-activity listing's query key, so a row edit can refresh them all. */
export const WORKFLOW_ACTIVITY_QUERY_KEY = 'workflow-activity';

type TEdited = { row: EntityCoreObjectTypes; listedAs?: TExtendedEntitiesTypeDict };
type TEdit = (row: EntityCoreObjectTypes, listedAs?: TExtendedEntitiesTypeDict) => void;

const EditContext = createContext<TEdit | null>(null);

/** Opens the name and description dialog on a row; `listedAs` is the type its listings go by. */
export function useEditWorkflowDetails(): TEdit {
  const edit = useContext(EditContext);
  if (!edit) throw new Error('useEditWorkflowDetails needs a WorkflowDetailsEditor above it');
  return edit;
}

/**
 * Holds the name and description dialog above the table whose rows open it: a row's cells come
 * and go as the table pages and refetches, and the dialog must not go with them.
 */
export function WorkflowDetailsEditor({ children }: { children: ReactNode }) {
  const { virtualLabId, projectId } = useWorkspace();
  const queryClient = useQueryClient();
  const [edited, setEdited] = useState<TEdited | null>(null);
  const workspace = useMemo(() => ({ virtualLabId, projectId }), [virtualLabId, projectId]);
  const edit = useCallback<TEdit>((row, listedAs) => setEdited({ row, listedAs }), []);

  return (
    <EditContext.Provider value={edit}>
      {children}
      {edited && (
        <WorkflowDetailsDialog
          key={edited.row.id}
          row={edited.row}
          workspace={workspace}
          onClose={() => setEdited(null)}
          onSaved={() => {
            // the editor's cached copy names the campaign as it was
            queryClient.removeQueries({
              queryKey: keyBuilder.simCampaign({ entityId: edited.row.id }),
            });
            // the listings elsewhere follow in their own time
            if (edited.listedAs) void invalidateEntityListings(queryClient, edited.listedAs);
            return queryClient.invalidateQueries({ queryKey: [WORKFLOW_ACTIVITY_QUERY_KEY] });
          }}
        />
      )}
    </EditContext.Provider>
  );
}
