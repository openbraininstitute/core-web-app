import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types';
import { CircuitScaleDictionary } from '@/api/entitycore/types/entities/circuit';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { WorkspaceSection } from '@/constants';
import { WorkflowActions } from '@/ui/segments/mini-detail-view/actions';
import { PanelQueryParam } from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';

vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'virtual-lab-id', projectId: 'project-id' }),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string | { pathname: string; query?: Record<string, string> };
    children: React.ReactNode;
  }) => {
    const normalizedHref =
      typeof href === 'string'
        ? href
        : `${href.pathname}?${new URLSearchParams(href.query ?? {}).toString()}`;

    return (
      <a href={normalizedHref} onClick={(event) => event.preventDefault()} {...props}>
        {children}
      </a>
    );
  },
}));

function makeRecord(
  type: EntityCoreObjectTypes['type'],
  attrs: Partial<EntityCoreObjectTypes> = {}
): EntityCoreObjectTypes {
  return {
    id: `${type}-id`,
    legacy_id: null,
    name: `${type} name`,
    type,
    ...attrs,
  } as EntityCoreObjectTypes;
}

describe('scan-config mini detail view simulate actions', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('session-id');
  });

  it.each([
    {
      label: 'ME model',
      record: makeRecord(EntityTypeDict.Memodel),
      dataType: ExtendedEntitiesTypeDict.Memodel,
      detailsHref: '//virtual-lab-id/project-id/data/view/memodel/memodel-id',
      useModelHref:
        '//virtual-lab-id/project-id/workflows/simulate/configure/memodel/memodel-id?sessionId=session-id&panel=configuration',
    },
    {
      label: 'single-neuron circuit',
      record: makeRecord(EntityTypeDict.Circuit, { scale: CircuitScaleDictionary.Single }),
      dataType: ExtendedEntitiesTypeDict.Circuit,
      detailsHref: '//virtual-lab-id/project-id/data/view/me-model-with-synapses/circuit-id',
      useModelHref:
        '//virtual-lab-id/project-id/workflows/simulate/configure/circuit/circuit-id?sessionId=session-id&panel=configuration',
    },
    {
      label: 'ion channel model',
      record: makeRecord(EntityTypeDict.IonChannelModel),
      dataType: ExtendedEntitiesTypeDict.IonChannelModel,
      detailsHref: '//virtual-lab-id/project-id/data/view/ion-channel-model/ion_channel_model-id',
      useModelHref:
        '//virtual-lab-id/project-id/workflows/simulate/configure/ion-channel-model/ion_channel_model-id?sessionId=session-id&panel=configuration',
    },
  ])('navigates from simulate mini detail actions for $label', ({
    record,
    dataType,
    detailsHref,
    useModelHref,
  }) => {
    render(
      <WorkflowActions
        section={WorkspaceSection.SimulateWorkflow}
        record={record}
        dataType={dataType}
      />
    );

    const detailsLink = screen.getByRole('button', { name: 'View details' });
    const useModelLink = screen.getByRole('button', { name: 'Use model' });

    fireEvent.click(detailsLink);
    fireEvent.click(useModelLink);

    expect(detailsLink).toHaveAttribute('href', detailsHref);
    expect(useModelLink).toHaveAttribute('href', useModelHref);
    expect(useModelLink).toHaveAttribute('href', expect.stringContaining(PanelQueryParam));
  });

  it('hides the simulate action when requested and keeps details navigation available', () => {
    render(
      <WorkflowActions
        section={WorkspaceSection.SimulateWorkflow}
        record={makeRecord(EntityTypeDict.Memodel)}
        dataType={ExtendedEntitiesTypeDict.Memodel}
        hideUseModelAction
      />
    );

    const detailsLink = screen.getByRole('button', { name: 'View details' });
    fireEvent.click(detailsLink);

    expect(detailsLink).toHaveAttribute(
      'href',
      '//virtual-lab-id/project-id/data/view/memodel/memodel-id'
    );
    expect(screen.queryByRole('button', { name: 'Use model' })).not.toBeInTheDocument();
  });
});
