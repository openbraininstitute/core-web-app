import {
  RiCheckboxMultipleBlankLine,
  RiFileCopy2Line,
  RiFileCopyLine,
  RiFolderLine,
  RiGitBranchLine,
} from '@remixicon/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { EntityLifecycleStatus, LifecycleStatusBadge } from '@/ui/molecules/lifecycle-status-badge';
import { ActivityValues } from '@/ui/segments/workflows/config';
import { WorkflowActivityActionsCell } from '@/ui/segments/workflows/elements/workflow-activity-cells';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';

const navigate = vi.fn();

vi.mock('@bprogress/next', () => ({ useRouter: () => ({ push: navigate }) }));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'vlab', projectId: 'proj' }),
}));
vi.mock('@/components/notification', () => ({
  useAppNotification: () => ({ info: vi.fn() }),
}));

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
});

describe('WorkflowActivityActionsCell', () => {
  it('renders one control per action, always all of them', () => {
    render(cell());

    for (const label of ['View configuration', 'View results', 'Duplicate', 'Copy ID']) {
      expect(action(label), `expected a "${label}" control`).toBeTruthy();
    }
  });

  it('gives each control a distinct icon', () => {
    render(cell());

    // remixicon renders its glyph as a <path d="…">, so the path data identifies the icon
    const glyphs = ['View configuration', 'View results', 'Duplicate', 'Copy ID'].map(
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

    for (const label of ['View configuration', 'View results', 'Duplicate', 'Copy ID']) {
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

  it('keeps View results disabled for a type whose results have no route', () => {
    render(
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
    // duplication always supports an ion-channel modeling campaign row
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

    expect(isDisabled('Duplicate')).toBe(false);
    fireEvent.click(action('Duplicate') as HTMLElement);
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});
