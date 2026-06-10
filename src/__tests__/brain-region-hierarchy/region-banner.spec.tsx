import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SpeciesSelectionMode } from '@/features/brain-region-hierarchy/types';

import type { BrainRegionHierarchyBase } from '@/api/entitycore/types/entities/brain-region';
import type {
  IHierarchyWithSpecies,
  IWorkspaceSpecies,
} from '@/features/brain-region-hierarchy/types';

// --- mock the boundaries RegionBanner depends on -----------------------------
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
  RegionBanner,
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

function brainRegion(name: string): BrainRegionHierarchyBase {
  return {
    id: `br-${name}`,
    name,
    acronym: name.toUpperCase(),
    parent_structure_id: '',
    color_hex_triplet: 'ff0000',
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

function renderBanner() {
  return render(<RegionBanner view={ExploreLeftMenuContext.DataGroup} onSwitchView={vi.fn()} />);
}

describe('RegionBanner (brain region view)', () => {
  beforeEach(() => setRegistry());

  it('shows skeletons for both species and brain region while loading', () => {
    setRegistry({ isUiLoading: true });
    const { container } = renderBanner();

    expect(screen.getByText('Species')).toBeInTheDocument();
    expect(screen.getByText('Region')).toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
  });

  it('shows the selected species and brain region once loaded', () => {
    setRegistry({ isUiLoading: false, selectedBrainRegion: brainRegion('cortex') });
    renderBanner();

    expect(screen.getAllByText('Mouse').length).toBeGreaterThan(0);
    // SelectedRegionPill capitalises the region name.
    expect(screen.getByText('Cortex')).toBeInTheDocument();
  });

  it('prompts to pick a region when none is selected', () => {
    setRegistry({ isUiLoading: false, selectedBrainRegion: null });
    renderBanner();

    expect(screen.getByText('Select region')).toBeInTheDocument();
  });

  it('hides the brain region picker in all-species mode', () => {
    setRegistry({
      isUiLoading: false,
      speciesSelectionMode: SpeciesSelectionMode.All,
      displaySpecies: null,
      selectedBrainRegion: null,
    });
    renderBanner();

    expect(screen.getAllByText('All').length).toBeGreaterThan(0);
    expect(screen.queryByText('Region')).not.toBeInTheDocument();
  });
});
