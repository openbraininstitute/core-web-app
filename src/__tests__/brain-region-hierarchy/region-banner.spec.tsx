import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SpeciesSelectionMode } from '@/features/brain-region-hierarchy/types';

import type { BrainRegionHierarchyBase } from '@/api/entitycore/types/entities/brain-region';
import type {
  IHierarchyWithSpecies,
  IWorkspaceSpecies,
} from '@/features/brain-region-hierarchy/types';

// --- mock the boundaries the region banner depends on ------------------------
// The data hook is mocked so we can drive the banner into each state directly;
// the 3D-viewer hooks module pulls webgl libraries we don't need; notifications
// need a provider we don't want to stand up.
const registry = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));

vi.mock('@/features/brain-region-hierarchy/hooks', () => ({
  useWorkspaceHierarchyRegistry: () => registry.value,
}));
vi.mock('@/features/brain-atlas-viewer/brain-atlas-viewer-gltf/hooks', () => ({
  ATLAS_3D_VIEWER_ERROR_MESSAGE_KEY: '3d-mesh-error',
}));
vi.mock('@/components/notification', () => ({
  useAppNotification: () => ({ destroy: vi.fn(), open: vi.fn(), close: vi.fn() }),
}));

import {
  ExploreLeftMenuContext,
  FocusedModeContent,
  HierarchyToggleButton,
  PortalRegionBanner,
  RegionBanner,
  SelectedRegionPill,
} from '@/features/brain-region-hierarchy/components/region-banner';

const mouseSpecies: IWorkspaceSpecies = {
  id: 's-mouse',
  name: 'Mus musculus',
  taxonomyId: 'NCBITaxon:10090',
  hierarchId: 'h-mouse',
  displayName: 'Mouse',
};
const available: IHierarchyWithSpecies[] = [
  { id: 'h-mouse', name: 'Mouse hierarchy', species: mouseSpecies },
];

function brainRegion(name: string, color = 'ff0000'): BrainRegionHierarchyBase {
  return {
    id: `br-${name}`,
    name,
    acronym: name.toUpperCase(),
    parent_structure_id: '',
    color_hex_triplet: color,
    annotation_value: 1,
    hierarchy_id: 'h-mouse',
  };
}

function setRegistry(overrides: Record<string, unknown> = {}) {
  registry.value = {
    changeBulkStoreHierarchySpecies: vi.fn(),
    displaySpecies: mouseSpecies,
    isUiLoading: false,
    selectedBrainRegion: brainRegion('cortex'),
    speciesSelectionMode: SpeciesSelectionMode.Focused,
    workspaceHierarchyId: 'h-mouse',
    remoteAvailableHierarchies: available,
    ...overrides,
  };
}

describe('RegionBanner (brain region view)', () => {
  beforeEach(() => setRegistry());

  it('shows skeletons for both species and brain region while loading', () => {
    setRegistry({ isUiLoading: true });
    const { container } = render(
      <RegionBanner view={ExploreLeftMenuContext.DataGroup} onSwitchView={vi.fn()} />
    );

    expect(screen.getByText('Species')).toBeInTheDocument();
    expect(screen.getByText('Region')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('shows the selected species and brain region once loaded', () => {
    setRegistry({ isUiLoading: false, selectedBrainRegion: brainRegion('cortex') });
    render(<RegionBanner view={ExploreLeftMenuContext.DataGroup} onSwitchView={vi.fn()} />);

    expect(screen.getAllByText('Mouse').length).toBeGreaterThan(0);
    expect(screen.getByText('Cortex')).toBeInTheDocument();
  });

  it('prompts to pick a region when none is selected', () => {
    setRegistry({ isUiLoading: false, selectedBrainRegion: null });
    render(<RegionBanner view={ExploreLeftMenuContext.DataGroup} onSwitchView={vi.fn()} />);

    expect(screen.getByText('Select region')).toBeInTheDocument();
  });

  it('hides the brain region picker in all-species mode', () => {
    setRegistry({
      isUiLoading: false,
      speciesSelectionMode: SpeciesSelectionMode.All,
      displaySpecies: null,
      selectedBrainRegion: null,
    });
    render(<RegionBanner view={ExploreLeftMenuContext.DataGroup} onSwitchView={vi.fn()} />);

    expect(screen.getAllByText('All').length).toBeGreaterThan(0);
    expect(screen.queryByText('Region')).not.toBeInTheDocument();
  });

  it('opens the hierarchy tree when the region area is clicked', () => {
    setRegistry({ isUiLoading: false });
    const onSwitchView = vi.fn();
    const { container } = render(
      <RegionBanner view={ExploreLeftMenuContext.DataGroup} onSwitchView={onSwitchView} />
    );

    const regionArea = container.querySelector('[data-label="brain-region-switcher"]');
    fireEvent.click(regionArea as Element);

    expect(onSwitchView).toHaveBeenCalledWith(ExploreLeftMenuContext.BrainRegionHierarchy);
  });
});

describe('FocusedModeContent', () => {
  it('shows a skeleton while loading', () => {
    const { container } = render(
      <FocusedModeContent loading selectedBrainRegion={null} onOpenTree={vi.fn()} />
    );

    expect(screen.getByText('Region')).toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).not.toBeNull();
  });

  it('shows the selected region pill when a region is set', () => {
    render(
      <FocusedModeContent
        loading={false}
        selectedBrainRegion={brainRegion('thalamus')}
        onOpenTree={vi.fn()}
      />
    );

    expect(screen.getByText('Thalamus')).toBeInTheDocument();
  });

  it('prompts to select a region when none is set', () => {
    render(<FocusedModeContent loading={false} selectedBrainRegion={null} onOpenTree={vi.fn()} />);

    expect(screen.getByText('Select region')).toBeInTheDocument();
  });

  it('opens the tree on click and on Enter/Space, but not on other keys', () => {
    const onOpenTree = vi.fn();
    // null region keeps the "Select region" content, so the only button role is
    // the region area itself (a selected pill would add a tooltip-trigger button).
    render(
      <FocusedModeContent loading={false} selectedBrainRegion={null} onOpenTree={onOpenTree} />
    );

    const trigger = screen.getByRole('button');
    fireEvent.click(trigger);
    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.keyDown(trigger, { key: ' ' });
    expect(onOpenTree).toHaveBeenCalledTimes(3);

    fireEvent.keyDown(trigger, { key: 'a' });
    expect(onOpenTree).toHaveBeenCalledTimes(3);
  });
});

describe('SelectedRegionPill', () => {
  it('shows the region name capitalised', () => {
    render(<SelectedRegionPill region={brainRegion('cortex')} />);

    expect(screen.getByText('Cortex')).toBeInTheDocument();
  });

  it('shows a colour dot using the region colour', () => {
    const { container } = render(<SelectedRegionPill region={brainRegion('cortex', '00ff00')} />);

    const dot = container.querySelector('.rounded-full');
    expect(dot).toHaveStyle({ backgroundColor: '#00ff00' });
  });
});

describe('HierarchyToggleButton', () => {
  it('switches to the hierarchy tree when closed', () => {
    const onSwitchView = vi.fn();
    render(
      <HierarchyToggleButton view={ExploreLeftMenuContext.DataGroup} onSwitchView={onSwitchView} />
    );

    fireEvent.click(screen.getByRole('button'));

    expect(onSwitchView).toHaveBeenCalledWith(ExploreLeftMenuContext.BrainRegionHierarchy);
  });

  it('switches back to the data group when the tree is open', () => {
    const onSwitchView = vi.fn();
    render(
      <HierarchyToggleButton
        view={ExploreLeftMenuContext.BrainRegionHierarchy}
        onSwitchView={onSwitchView}
      />
    );

    fireEvent.click(screen.getByRole('button'));

    expect(onSwitchView).toHaveBeenCalledWith(ExploreLeftMenuContext.DataGroup);
  });
});

describe('PortalRegionBanner', () => {
  beforeEach(() => setRegistry());

  it('renders the banner but not the tree panel when closed', () => {
    render(
      <PortalRegionBanner initialOpen={false} portalContainer={document.body}>
        <div data-testid="tree-panel">tree</div>
      </PortalRegionBanner>
    );

    expect(screen.getByText('Species')).toBeInTheDocument();
    expect(screen.queryByTestId('tree-panel')).not.toBeInTheDocument();
  });

  it('renders the tree panel in a portal when opened', () => {
    render(
      <PortalRegionBanner initialOpen portalContainer={document.body}>
        <div data-testid="tree-panel">tree</div>
      </PortalRegionBanner>
    );

    expect(screen.getByTestId('tree-panel')).toBeInTheDocument();
  });
});
