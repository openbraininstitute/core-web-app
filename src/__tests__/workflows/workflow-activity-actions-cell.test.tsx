import {
  RiCheckboxMultipleBlankLine,
  RiFileCopy2Line,
  RiFileCopyLine,
  RiFolderLine,
  RiGitBranchLine,
  RiPencilLine,
} from '@remixicon/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render as renderUi, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types';
import { TaskConfigType } from '@/api/entitycore/types/entities/task-config';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityLifecycleStatus, LifecycleStatusBadge } from '@/ui/molecules/lifecycle-status-badge';
import { ActivityValues } from '@/ui/segments/workflows/config';
import { createAllWorkflowsDataSource } from '@/ui/segments/workflows/elements/workflow-activity-all';
import { WorkflowActivityActionsCell } from '@/ui/segments/workflows/elements/workflow-activity-cells';
import { buildWorkflowActivitySchema } from '@/ui/segments/workflows/elements/workflow-activity-schema';

import type { ReactElement, ReactNode } from 'react';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';

const navigate = vi.fn();
const updateEntityDetails = vi.fn();

vi.mock('@bprogress/next', () => ({ useRouter: () => ({ push: navigate }) }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vlab', projectId: 'proj' }),
}));
vi.mock('@/components/notification', () => ({
  useAppNotification: () => ({ info: vi.fn() }),
}));
vi.mock('@/api/entitycore/queries/general/entity', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  updateEntityDetails: (args: unknown) => updateEntityDetails(args),
}));

/** Every render inside a query client: the cell refreshes the listings after an edit. */
function render(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return renderUi(ui, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
}

const ACTIONS = [
  'Edit name and description',
  'View configuration',
  'View results',
  'Duplicate',
  'Copy ID',
];

const ROW_ID = '11111111-1111-1111-1111-111111111111';

const row = (over: Record<string, unknown> = {}) =>
  ({
    id: ROW_ID,
    name: 'A campaign',
    type: EntityTypeDict.Memodel,
    ...over,
  }) as unknown as EntityCoreObjectTypes;

const BUILD_MEMODEL = {
  activity: ActivityValues.Build,
  entityType: ExtendedEntitiesTypeDict.Memodel,
};

function cell(params: Record<string, unknown> = BUILD_MEMODEL) {
  return <WorkflowActivityActionsCell row={row()} value="" rowIndex={0} params={params} />;
}

/** Actions are icons: the accessible name is the only label, and it matches the tooltip. */
const action = (label: string) => screen.queryByLabelText(label);

/** Path data of a standalone icon, so a test can name the mark instead of a literal. */
function glyph(icon: React.ReactElement): string | null {
  const { container, unmount } = render(icon);
  const d = container.querySelector('svg path')?.getAttribute('d') ?? null;
  unmount();
  return d;
}

const isDisabled = (label: string) =>
  (action(label) as HTMLButtonElement | null)?.disabled ?? false;

beforeEach(() => {
  navigate.mockClear();
  updateEntityDetails.mockReset();
});

describe('WorkflowActivityActionsCell', () => {
  it('renders one control per action, always all of them', () => {
    render(cell());

    for (const label of ACTIONS) {
      expect(action(label), `expected a "${label}" control`).toBeTruthy();
    }
  });

  it('gives each control a distinct icon', () => {
    render(cell());

    // remixicon renders its glyph as a <path d="…">, so the path data identifies the icon
    const glyphs = ACTIONS.map(
      (label) => action(label)?.querySelector('svg path')?.getAttribute('d') ?? null
    );

    expect(glyphs.every(Boolean)).toBe(true);
    expect(new Set(glyphs).size).toBe(glyphs.length);
  });

  it('pins each action to its intended mark', () => {
    render(cell());
    const glyphOf = (label: string) =>
      action(label)?.querySelector('svg path')?.getAttribute('d') ?? null;

    // "all four differ" passes for two copy variants that look alike at 16px
    expect(glyphOf('Edit name and description')).toBe(glyph(<RiPencilLine />));
    expect(glyphOf('View configuration')).toBe(glyph(<RiFolderLine />));
    expect(glyphOf('Duplicate')).toBe(glyph(<RiGitBranchLine />));
    expect(glyphOf('Copy ID')).toBe(glyph(<RiFileCopyLine />));

    for (const copyFamily of [
      <RiFileCopyLine key="a" />,
      <RiFileCopy2Line key="b" />,
      <RiCheckboxMultipleBlankLine key="c" />,
    ]) {
      expect(glyphOf('Duplicate')).not.toBe(glyph(copyFamily));
    }
  });

  it('makes every control round and pill-height, so the row lines up', () => {
    const { container } = render(
      <>
        {cell()}
        <LifecycleStatusBadge status={EntityLifecycleStatus.Active} />
      </>
    );

    const badge = container.querySelector<HTMLElement>('[data-slot="badge"]');
    expect(badge?.className).toContain('h-8');

    for (const label of ACTIONS) {
      const el = action(label) as HTMLElement;
      expect(el.className, `"${label}" should be round`).toContain('rounded-full');
      expect(el.className, `"${label}" should match the pill height`).toContain('size-8');
    }
  });

  it('navigates by link for the actions that are navigations', () => {
    render(cell());

    // a real anchor, so middle-click and open-in-new-tab work
    expect(action('View configuration')?.tagName).toBe('A');
    expect(action('View configuration')).toHaveAttribute('href');
  });

  it('DISABLES rather than hides an action the row does not support', () => {
    render(cell());

    // build activity → no results to view
    expect(action('View results')).toBeTruthy();
    expect(isDisabled('View results')).toBe(true);
  });

  it('keeps View results disabled for a row that resolves to no results view', () => {
    render(
      // a campaign row with no input entity: its scan-config editor URL cannot be built
      <WorkflowActivityActionsCell
        row={row({ type: EntityTypeDict.TaskConfig })}
        value=""
        rowIndex={0}
        params={{
          activity: ActivityValues.Extract,
          entityType: ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
        }}
      />
    );

    expect(isDisabled('View results')).toBe(true);
  });

  it('ENABLES View results for a scan-config campaign, on its own results tab', () => {
    render(
      <WorkflowActivityActionsCell
        row={row({ type: EntityTypeDict.TaskConfig, inputs: [{ id: 'source-entity' }] })}
        value=""
        rowIndex={0}
        params={{
          activity: ActivityValues.Extract,
          entityType: ExtendedEntitiesTypeDict.CircuitExtractionCampaign,
        }}
      />
    );

    // the detail-view results route has nothing to open for this campaign; the editor does
    expect(action('View results')?.getAttribute('href')).toContain('tab=extractions');
  });

  it('ENABLES View results where the type does have one', () => {
    render(
      <WorkflowActivityActionsCell
        row={row({ type: EntityTypeDict.SingleNeuronSynaptomeSimulation })}
        value=""
        rowIndex={0}
        params={{
          activity: ActivityValues.Simulate,
          entityType: ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
        }}
      />
    );

    // proves the disabled check discriminates, not that it always reports disabled
    expect(action('View results')?.tagName).toBe('A');
  });

  it('disables every action when the params carry no activity or type', () => {
    render(cell({}));

    expect(isDisabled('View configuration')).toBe(true);
    expect(isDisabled('Duplicate')).toBe(true);
  });

  it('shows the title on hover — including for a DISABLED action', async () => {
    render(cell());
    const tooltip = () => document.querySelector('[data-slot="tooltip-content"]');

    // a disabled button receives no pointer events; the wrapping span owns the hover
    expect(isDisabled('Duplicate')).toBe(true);
    expect(tooltip()).toBeNull();

    fireEvent.pointerEnter(action('Duplicate') as HTMLElement);
    fireEvent.focus(action('Duplicate') as HTMLElement);

    await waitFor(() => expect(tooltip()).toBeTruthy());
    expect(tooltip()?.textContent).toContain('Duplicate');
  });

  it('copies the row id and confirms through the tooltip label', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    render(cell());
    fireEvent.click(action('Copy ID') as HTMLElement);

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(ROW_ID));
    // the label carries the confirmation
    await waitFor(() => expect(action('Copied')).toBeTruthy());
  });

  it('duplicates through the router when clicked', () => {
    render(
      <WorkflowActivityActionsCell
        row={row({
          type: EntityTypeDict.TaskConfig,
          task_config_type: TaskConfigType.IonChannelModelingCampaign,
          inputs: [{ id: 'recording-id', type: EntityTypeDict.IonChannelRecording }],
        })}
        value=""
        rowIndex={0}
        params={{
          activity: ActivityValues.Build,
          entityType: ExtendedEntitiesTypeDict.IonChannelBuildCampaign,
        }}
      />
    );

    expect(isDisabled('Duplicate')).toBe(false);
    fireEvent.click(action('Duplicate') as HTMLElement);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('cannot duplicate an ion channel campaign from before the scan-config editor', () => {
    render(
      <WorkflowActivityActionsCell
        row={row({ type: EntityTypeDict.IonChannelModelingCampaign })}
        value=""
        rowIndex={0}
        params={{
          activity: ActivityValues.Build,
          entityType: ExtendedEntitiesTypeDict.IonChannelModelingCampaign,
        }}
      />
    );

    expect(isDisabled('Duplicate')).toBe(true);
  });

  it('takes the workflow an All row brings, rather than the listing params', async () => {
    const workspace = { virtualLabId: 'vlab', projectId: 'proj' };
    const all = createAllWorkflowsDataSource({
      sources: [
        {
          activity: ActivityValues.Build,
          targetType: ExtendedEntitiesTypeDict.Memodel,
          label: 'ME-model',
          list: async () => ({
            data: [row()],
            pagination: { page: 1, page_size: 1, total_items: 1 },
          }),
        },
      ],
      schema: buildWorkflowActivitySchema({
        activity: undefined,
        activityName: '',
        entityType: undefined,
        workspace,
      }),
      context: workspace,
    });
    const {
      rows: [allRow],
    } = await all.fetch({ page: 1, pageSize: 1, sort: [], filters: {} });

    render(<WorkflowActivityActionsCell row={allRow} value="" rowIndex={0} params={{}} />);

    expect(action('View configuration')?.tagName).toBe('A');
  });
});

describe('editing the name and description of a row', () => {
  const open = () => {
    render(cell());
    fireEvent.click(action('Edit name and description') as HTMLElement);
  };
  const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
  const save = () => screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement;

  it('opens a dialog holding the current name', () => {
    open();

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(field('Name').value).toBe('A campaign');
    expect(field('Description').value).toBe('');
  });

  it('saves the trimmed name and description to the entity, then closes', async () => {
    updateEntityDetails.mockResolvedValue({});
    open();

    fireEvent.change(field('Name'), { target: { value: '  Renamed  ' } });
    fireEvent.change(field('Description'), { target: { value: 'What it is for ' } });
    fireEvent.click(save());

    await waitFor(() =>
      expect(updateEntityDetails).toHaveBeenCalledWith({
        type: EntityTypeDict.Memodel,
        id: ROW_ID,
        data: { name: 'Renamed', description: 'What it is for' },
        context: { virtualLabId: 'vlab', projectId: 'proj' },
      })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('offers Save only once something changed, and never for an empty name', () => {
    open();
    expect(save().disabled).toBe(true);

    fireEvent.change(field('Name'), { target: { value: '   ' } });
    expect(save().disabled).toBe(true);

    fireEvent.change(field('Name'), { target: { value: 'Renamed' } });
    expect(save().disabled).toBe(false);
  });

  it('says why a save failed and stays open', async () => {
    updateEntityDetails.mockRejectedValue(new Error('Not allowed'));
    open();

    fireEvent.change(field('Name'), { target: { value: 'Renamed' } });
    fireEvent.click(save());

    expect((await screen.findByRole('alert')).textContent).toContain('Not allowed');
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
