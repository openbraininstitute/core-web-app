import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
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

const row = (over: Record<string, unknown> = {}) =>
  ({
    id: '11111111-1111-1111-1111-111111111111',
    name: 'A campaign',
    type: EntityTypeDict.Memodel,
    ...over,
  }) as unknown as EntityCoreObjectTypes;

/** Open the row's three-dot menu and return the rendered menu items by label. */
async function openMenu(ui: React.ReactElement) {
  render(ui);
  // Radix opens a dropdown on keyboard activation too, which jsdom handles reliably
  // (its pointer-event support is partial).
  fireEvent.keyDown(screen.getByTestId('workflow-activity-row-actions'), { key: 'Enter' });
  await waitFor(() => expect(screen.getByRole('menu')).toBeTruthy());
  return (label: string) =>
    screen.getAllByRole('menuitem').find((el) => el.textContent?.trim() === label);
}

/** Radix marks a disabled menu item with `data-disabled`, not the `disabled` attribute. */
const isDisabled = (el: HTMLElement | undefined) => el?.hasAttribute('data-disabled') ?? false;

beforeEach(() => {
  navigate.mockClear();
});

describe('WorkflowActivityActionsCell', () => {
  it('always lists every action, so the menu reads the same for every row', async () => {
    const item = await openMenu(
      <WorkflowActivityActionsCell
        row={row()}
        value=""
        rowIndex={0}
        params={{
          activity: ActivityValues.Build,
          entityType: ExtendedEntitiesTypeDict.Memodel,
        }}
      />
    );

    for (const label of ['View configuration', 'View results', 'Duplicate', 'Copy ID']) {
      expect(item(label), `expected "${label}" in the menu`).toBeTruthy();
    }
  });

  it('gives every action a leading icon', async () => {
    const item = await openMenu(
      <WorkflowActivityActionsCell
        row={row()}
        value=""
        rowIndex={0}
        params={{
          activity: ActivityValues.Build,
          entityType: ExtendedEntitiesTypeDict.Memodel,
        }}
      />
    );

    for (const label of ['View configuration', 'View results', 'Duplicate', 'Copy ID']) {
      expect(item(label)?.querySelector('svg'), `expected an icon on "${label}"`).toBeTruthy();
    }
  });

  it('gives Copy ID and Duplicate DIFFERENT icons', async () => {
    const item = await openMenu(
      <WorkflowActivityActionsCell
        row={row()}
        value=""
        rowIndex={0}
        params={{
          activity: ActivityValues.Build,
          entityType: ExtendedEntitiesTypeDict.Memodel,
        }}
      />
    );

    // remixicon renders its glyph as a <path d="…">, so the path data identifies the icon
    const glyph = (label: string) =>
      item(label)?.querySelector('svg path')?.getAttribute('d') ?? null;

    expect(glyph('Copy ID')).toBeTruthy();
    expect(glyph('Duplicate')).toBeTruthy();
    expect(glyph('Copy ID')).not.toBe(glyph('Duplicate'));
  });

  it('copies the row id to the clipboard and confirms in place', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    const item = await openMenu(
      <WorkflowActivityActionsCell
        row={row()}
        value=""
        rowIndex={0}
        params={{
          activity: ActivityValues.Build,
          entityType: ExtendedEntitiesTypeDict.Memodel,
        }}
      />
    );

    const copy = item('Copy ID');
    expect(copy).toBeTruthy();
    fireEvent.click(copy as HTMLElement);

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111')
    );
    // the menu stays open so the "Copied" confirmation is actually visible
    await waitFor(() => expect(screen.getByRole('menu').textContent).toContain('Copied'));
  });

  it('carries the interactive styling on both the link and the plain rows', async () => {
    const item = await openMenu(
      <WorkflowActivityActionsCell
        row={row()}
        value=""
        rowIndex={0}
        params={{
          activity: ActivityValues.Build,
          entityType: ExtendedEntitiesTypeDict.Memodel,
        }}
      />
    );

    // "View configuration" renders through `asChild` into a <Link>; "Duplicate" does
    // not. Radix has to forward the class through Slot for the first to be styled.
    for (const label of ['View configuration', 'Duplicate', 'Copy ID']) {
      const el = item(label);
      expect(el?.className, `expected a hand cursor on "${label}"`).toContain('cursor-pointer');
      expect(el?.className, `expected the primary-8 highlight on "${label}"`).toContain(
        'data-[highlighted]:bg-primary-8'
      );
    }
  });

  it('keeps View results DISABLED rather than hidden on a build activity', async () => {
    const item = await openMenu(
      <WorkflowActivityActionsCell
        row={row()}
        value=""
        rowIndex={0}
        params={{
          activity: ActivityValues.Build,
          entityType: ExtendedEntitiesTypeDict.Memodel,
        }}
      />
    );

    expect(item('View results')).toBeTruthy();
    expect(isDisabled(item('View results'))).toBe(true);
  });

  it('keeps View results disabled for a type whose results have no route', async () => {
    const item = await openMenu(
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

    expect(item('View results')).toBeTruthy();
    expect(isDisabled(item('View results'))).toBe(true);
  });

  it('ENABLES View results on a simulate activity whose type has a results route', async () => {
    const item = await openMenu(
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

    // The negative cases above only prove the item exists; this proves the disabled
    // check discriminates rather than always reporting true.
    expect(isDisabled(item('View results'))).toBe(false);
  });

  it('disables every action when the params carry no activity or type', async () => {
    const item = await openMenu(
      <WorkflowActivityActionsCell row={row()} value="" rowIndex={0} params={{}} />
    );

    expect(isDisabled(item('View configuration'))).toBe(true);
    expect(isDisabled(item('Duplicate'))).toBe(true);
  });
});
