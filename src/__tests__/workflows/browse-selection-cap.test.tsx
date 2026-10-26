import { act, render, screen } from '@testing-library/react';
import { Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  type EntityCoreIdentifiableNamed,
  EntityLifecycleStatus,
} from '@/api/entitycore/types/shared/global';
import { WorkspaceSection } from '@/constants';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { ScanConfigFromIdType } from '@/features/scan-config/workflow/scan-config-from-id-type';
import { createWorkflowNewRoutePage } from '@/ui/segments/workflows/browse/listing';

import type { ConfigSchema } from '@/features/scan-config/types';
import type { ListingTableProps } from '@/features/views/listing/types';

const schemaState = vi.hoisted(() => ({ schema: undefined as unknown }));
const tableState = vi.hoisted(() => ({
  props: undefined as ListingTableProps<EntityCoreIdentifiableNamed> | undefined,
}));

vi.mock('@/features/scan-config/components/hooks/schema', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useObioneJsonSchema: () => ({ schema: schemaState.schema, isLoading: false }),
}));
vi.mock('@/features/views/listing/browse-entity', () => ({
  BrowseEntityScope: ({
    mainTableProps,
  }: {
    mainTableProps: ListingTableProps<EntityCoreIdentifiableNamed>;
  }) => {
    tableState.props = mainTableProps;
    return null;
  },
}));
vi.mock('@bprogress/next', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  notFound: () => {
    throw new Error('notFound');
  },
}));
vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'lab', projectId: 'project' }),
}));
vi.mock('@/ui/segments/workflows/browse/workflow-breadcrumb-context', () => ({
  useWorkflowBreadcrumbState: () => ({ setBreadcrumbState: () => {} }),
}));

function recordingsSchema(maxItems?: number) {
  return {
    properties: {
      initialize: {
        ui_element: ScanConfigUIElementDict.BlockSingle,
        properties: {
          recordings: {
            ui_element: ScanConfigUIElementDict.ModelIdentifierMultiple,
            type: 'array',
            ...(maxItems === undefined ? {} : { maxItems }),
            items: {
              properties: {
                type: { type: 'string', const: ScanConfigFromIdType.IonChannelRecordingFromID },
              },
            },
          },
        },
      },
    },
  } as unknown as ConfigSchema;
}

function recording(id: string) {
  return {
    id,
    name: id,
    type: ExtendedEntitiesTypeDict.IonChannelRecording,
    legacy_id: null,
    lifecycle_status: EntityLifecycleStatus.Active,
  } as EntityCoreIdentifiableNamed;
}

async function renderIonChannelBuildBrowse() {
  const Page = createWorkflowNewRoutePage('build', WorkspaceSection.GeneralWorkflow);
  const params = Promise.resolve({
    virtualLabId: 'lab',
    projectId: 'project',
    type: 'ion-channel-build-campaign',
  });
  await act(async () => {
    render(
      <Suspense>
        <Page params={params as never} searchParams={Promise.resolve(null) as never} />
      </Suspense>
    );
  });
}

function selectRows(ids: string[]) {
  act(() => tableState.props?.onRowsSelected?.(ids.map(recording)));
}

function selectionButton() {
  return screen.getByRole('button', { name: /use selection/i });
}

describe('workflow browse selection cap from the schema maxItems', () => {
  beforeEach(() => {
    tableState.props = undefined;
  });

  it('stops picks at the cap but keeps picked rows unpickable', async () => {
    schemaState.schema = recordingsSchema(3);
    await renderIonChannelBuildBrowse();

    expect(tableState.props?.hideSelectAll).toBe(true);
    expect(screen.getByTestId('workflow-browse-selection-cap')).toHaveTextContent(
      '0 / 3 selected (max 3 allowed)'
    );

    selectRows(['a', 'b', 'c']);

    expect(screen.getByTestId('workflow-browse-selection-cap')).toHaveTextContent('3 / 3 selected');
    expect(tableState.props?.isRowSelectable?.(recording('d'))).toBe(false);
    expect(tableState.props?.isRowSelectable?.(recording('a'))).toBe(true);
    expect(selectionButton()).toBeEnabled();
  });

  it('drops picks past the cap when a shift-click range arrives in one batch', async () => {
    schemaState.schema = recordingsSchema(3);
    await renderIonChannelBuildBrowse();

    selectRows(['a']);
    selectRows(['a', 'b', 'c', 'd', 'e']);

    expect(tableState.props?.selectedRows?.map((row) => row.id)).toEqual(['a', 'b', 'c']);
    expect(screen.getByTestId('workflow-browse-selection-cap')).toHaveTextContent('3 / 3 selected');
    expect(selectionButton()).toBeEnabled();
  });

  it('leaves the selection uncapped when the field has no maxItems', async () => {
    schemaState.schema = recordingsSchema();
    await renderIonChannelBuildBrowse();

    selectRows(['a', 'b', 'c', 'd']);

    expect(screen.queryByTestId('workflow-browse-selection-cap')).toBeNull();
    expect(tableState.props?.isRowSelectable).toBeUndefined();
    expect(selectionButton()).toBeEnabled();
  });
});
