import { describe, expect, it } from 'vitest';

import {
  buildHierarchyMap,
  createAllSpeciesSelection,
  findParentIds,
  getBrainRegionDescendantsAndAncestorsNodes,
  getHierarchyBannerLoading,
  getLeavesForEachRegion,
  getSpeciesDisplayName,
  injectHierarchyId,
  mergeHierarchyWithAtlas,
  normalizeBrainRegionName,
  pickValidHierarchyId,
  resolveDisplayWorkspaceSpecies,
  resolveEffectiveHierarchyId,
  transformSpecies,
} from '@/features/brain-region-hierarchy/helpers';
import { SpeciesSelectionMode } from '@/features/brain-region-hierarchy/types';

import type { IBrainAtlasRegion } from '@/api/entitycore/types/entities/brain-atlas';
import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';
import type {
  IHierarchyWithSpecies,
  IWorkspaceSpecies,
} from '@/features/brain-region-hierarchy/types';

// --- tiny fixture builders so each test reads as a small, obvious tree --------

function region(
  id: string,
  children: IBrainRegionHierarchy[] = [],
  overrides: Partial<IBrainRegionHierarchy> = {}
): IBrainRegionHierarchy {
  return {
    id,
    name: id,
    acronym: id.toUpperCase(),
    parent_structure_id: '',
    color_hex_triplet: 'ffffff',
    annotation_value: 0,
    hierarchy_id: 'h-test',
    children,
    ...overrides,
  };
}

function species(hierarchId: string, name: string, displayName: string): IWorkspaceSpecies {
  return { id: `s-${hierarchId}`, name, taxonomyId: `tax-${hierarchId}`, hierarchId, displayName };
}

function hierarchy(id: string, name: string, displayName: string): IHierarchyWithSpecies {
  return { id, name: `${name} hierarchy`, species: species(id, name, displayName) };
}

function atlasRegion(volume: number, isLeaf: boolean): IBrainAtlasRegion {
  return { volume, is_leaf_region: isLeaf } as unknown as IBrainAtlasRegion;
}

const mouse = hierarchy('h-mouse', 'Mus musculus', 'Mouse');
const human = hierarchy('h-human', 'Homo sapiens', 'Human');
const available = [mouse, human];

describe('brain region hierarchy', () => {
  describe('normalizeBrainRegionName', () => {
    it('capitalises the first letter of a region name', () => {
      expect(normalizeBrainRegionName('cortex')).toBe('Cortex');
    });

    it('leaves a name that is already capitalised alone', () => {
      expect(normalizeBrainRegionName('Cortex')).toBe('Cortex');
    });

    it('does nothing to an empty name', () => {
      expect(normalizeBrainRegionName('')).toBe('');
    });
  });

  describe('injectHierarchyId', () => {
    it('stamps the hierarchy id onto every node in the tree', () => {
      const tree = region('root', [region('child', [region('grandchild')])]);

      const stamped = injectHierarchyId(tree, 'h-xyz');

      expect(stamped.hierarchy_id).toBe('h-xyz');
      expect(stamped.children[0].hierarchy_id).toBe('h-xyz');
      expect(stamped.children[0].children[0].hierarchy_id).toBe('h-xyz');
    });
  });

  describe('findParentIds', () => {
    const tree = region('root', [region('mid', [region('leaf')])]);

    it('returns the path of ancestors down to a region', () => {
      expect(findParentIds(tree, 'leaf')).toEqual(['root', 'mid']);
    });

    it('returns an empty path for the root itself', () => {
      expect(findParentIds(tree, 'root')).toEqual([]);
    });

    it('returns an empty path when the region is not in the tree', () => {
      expect(findParentIds(tree, 'nope')).toEqual([]);
    });
  });

  describe('getLeavesForEachRegion', () => {
    // root → mid → (leafA, leafB)
    const tree = region('root', [region('mid', [region('leafA'), region('leafB')])]);
    const leaves = getLeavesForEachRegion(tree);

    it('lists every leaf that lives under a region', () => {
      expect(
        leaves
          .get('root')
          ?.map((r) => r.id)
          .sort()
      ).toEqual(['leafA', 'leafB']);
    });

    it('treats a leaf as its own only leaf', () => {
      expect(leaves.get('leafA')?.map((r) => r.id)).toEqual(['leafA']);
    });
  });

  describe('buildHierarchyMap', () => {
    const tree = region('root', [region('mid', [region('leaf')])]);
    const map = buildHierarchyMap(tree);

    it('flattens every node into the map', () => {
      expect(map.size).toBe(3);
    });

    it('remembers each node parent', () => {
      expect(map.get('mid')?.parent).toBe('root');
      expect(map.get('leaf')?.parent).toBe('mid');
    });

    it('leaves the root without a parent', () => {
      expect(map.get('root')?.parent).toBeUndefined();
    });
  });

  describe('getBrainRegionDescendantsAndAncestorsNodes', () => {
    it('returns the region together with its descendants and ancestors', () => {
      const tree = region('root', [region('mid', [region('leaf')])]);

      const ids = getBrainRegionDescendantsAndAncestorsNodes(['mid'], tree)
        .map((r) => r.id)
        .sort();

      expect(ids).toEqual(['leaf', 'mid', 'root']);
    });
  });

  describe('mergeHierarchyWithAtlas', () => {
    // root → (withVolume leaf, emptyRegion). Only "withVolume" has atlas volume.
    const tree = region('root', [region('withVolume'), region('emptyRegion')]);
    const atlas = new Map<string, IBrainAtlasRegion>([['withVolume', atlasRegion(5, true)]]);
    const merged = mergeHierarchyWithAtlas(tree, atlas);

    it('copies volume and leaf info from the atlas onto the region', () => {
      const withVolume = merged.children.find((c) => c.id === 'withVolume');
      expect(withVolume?.volume).toBe(5);
      expect(withVolume?.is_leaf_region).toBe(true);
    });

    it('marks a region as volumetric when it has its own volume', () => {
      const withVolume = merged.children.find((c) => c.id === 'withVolume');
      expect(withVolume?.is_volumetric_region).toBe(true);
    });

    it('marks a parent volumetric when any descendant has volume', () => {
      expect(merged.is_volumetric_region).toBe(true);
    });

    it('keeps a region without volume non-volumetric', () => {
      const empty = merged.children.find((c) => c.id === 'emptyRegion');
      expect(empty?.is_volumetric_region).toBe(false);
      expect(empty?.volume).toBe(0);
    });
  });

  describe('pickValidHierarchyId', () => {
    it('keeps the first id that still exists in the available list', () => {
      expect(pickValidHierarchyId(['h-human', 'h-mouse'], available, 'h-mouse')).toBe('h-human');
    });

    it('falls back to the default when the saved id no longer exists', () => {
      expect(pickValidHierarchyId(['h-gone'], available, 'h-mouse')).toBe('h-mouse');
    });

    it('skips a stale higher-priority id in favour of a valid lower-priority one', () => {
      expect(pickValidHierarchyId(['h-gone', 'h-human'], available, 'h-mouse')).toBe('h-human');
    });

    it('ignores empty or missing candidates', () => {
      expect(pickValidHierarchyId([null, undefined, '', 'h-human'], available, 'h-mouse')).toBe(
        'h-human'
      );
    });

    it('does not validate yet while the available list is still loading', () => {
      // undefined list = not loaded; we keep the saved id rather than fight the loading state.
      expect(pickValidHierarchyId(['h-gone'], undefined, 'h-mouse')).toBe('h-gone');
      expect(pickValidHierarchyId([], undefined, 'h-mouse')).toBe('h-mouse');
    });

    it('falls back to the first available id when even the default is gone', () => {
      expect(pickValidHierarchyId(['h-gone'], available, 'h-default-also-gone')).toBe('h-mouse');
    });
  });

  describe('resolveEffectiveHierarchyId', () => {
    it('prefers url over remote over storage over default', () => {
      expect(
        resolveEffectiveHierarchyId({
          urlHierarchyId: 'h-human',
          remoteHierarchyId: 'h-mouse',
          storageHierarchyId: 'h-mouse',
          defaultHierarchyId: 'h-mouse',
          availableHierarchies: available,
        })
      ).toBe('h-human');
    });

    it('validates the saved id against the available list and falls back to the default', () => {
      expect(
        resolveEffectiveHierarchyId({
          remoteHierarchyId: 'h-gone',
          storageHierarchyId: 'h-gone',
          defaultHierarchyId: 'h-mouse',
          availableHierarchies: available,
        })
      ).toBe('h-mouse');
    });

    it('behaves like the old priority chain when no available list is given', () => {
      expect(
        resolveEffectiveHierarchyId({
          remoteHierarchyId: 'h-gone',
          defaultHierarchyId: 'h-mouse',
        })
      ).toBe('h-gone');
    });
  });

  describe('getHierarchyBannerLoading', () => {
    const settled = {
      syncSettled: true,
      hasPendingUrlOverride: false,
      isBootstrapLoading: false,
      isRootHierarchyLoading: false,
      isAllMode: false,
      displaySpecies: mouse.species,
    };

    it('is done loading once everything has settled and a species is resolved', () => {
      expect(getHierarchyBannerLoading(settled)).toBe(false);
    });

    it('keeps loading until the initial sync settles', () => {
      expect(getHierarchyBannerLoading({ ...settled, syncSettled: false })).toBe(true);
    });

    it('keeps loading while the bootstrap queries are in flight', () => {
      expect(getHierarchyBannerLoading({ ...settled, isBootstrapLoading: true })).toBe(true);
    });

    it('keeps loading while a url override is still being applied', () => {
      expect(getHierarchyBannerLoading({ ...settled, hasPendingUrlOverride: true })).toBe(true);
    });

    it('stays loading in focused mode when no species could be resolved (the stuck-panel case)', () => {
      expect(getHierarchyBannerLoading({ ...settled, displaySpecies: null })).toBe(true);
    });

    it('is done in "all species" mode even without a resolved species', () => {
      expect(getHierarchyBannerLoading({ ...settled, isAllMode: true, displaySpecies: null })).toBe(
        false
      );
    });
  });
});

describe('species', () => {
  describe('getSpeciesDisplayName', () => {
    it('turns a scientific name into a friendly common name', () => {
      expect(getSpeciesDisplayName('Mus musculus')).toBe('Mouse');
      expect(getSpeciesDisplayName('Homo sapiens')).toBe('Human');
    });

    it('falls back to the scientific name when there is no common name', () => {
      expect(getSpeciesDisplayName('Unknownus speciesus')).toBe('Unknownus speciesus');
    });
  });

  describe('transformSpecies', () => {
    it('builds a workspace species with a friendly display name and the hierarchy it belongs to', () => {
      const result = transformSpecies('h-mouse', {
        id: 's1',
        name: 'Mus musculus',
        taxonomy_id: 'NCBITaxon:10090',
      });

      expect(result).toEqual({
        id: 's1',
        name: 'Mus musculus',
        taxonomyId: 'NCBITaxon:10090',
        hierarchId: 'h-mouse',
        displayName: 'Mouse',
      });
    });
  });

  describe('resolveDisplayWorkspaceSpecies', () => {
    it('shows no species in "all species" mode', () => {
      expect(
        resolveDisplayWorkspaceSpecies({
          isAllMode: true,
          workspaceSpecies: mouse.species,
          workspaceHierarchyId: 'h-mouse',
          remoteAvailableHierarchies: available,
        })
      ).toBeNull();
    });

    it('uses the already-selected species when it has a display name', () => {
      expect(
        resolveDisplayWorkspaceSpecies({
          isAllMode: false,
          workspaceSpecies: human.species,
          workspaceHierarchyId: 'h-mouse',
          remoteAvailableHierarchies: available,
        })
      ).toBe(human.species);
    });

    it('looks the species up by hierarchy id when none is selected yet', () => {
      expect(
        resolveDisplayWorkspaceSpecies({
          isAllMode: false,
          workspaceSpecies: null,
          workspaceHierarchyId: 'h-human',
          remoteAvailableHierarchies: available,
        })
      ).toBe(human.species);
    });

    it('returns nothing when the hierarchy id is not in the available list', () => {
      expect(
        resolveDisplayWorkspaceSpecies({
          isAllMode: false,
          workspaceSpecies: null,
          workspaceHierarchyId: 'h-gone',
          remoteAvailableHierarchies: available,
        })
      ).toBeNull();
    });
  });

  describe('createAllSpeciesSelection', () => {
    it('builds an empty selection flagged as "all" species', () => {
      const selection = createAllSpeciesSelection();

      expect(selection.speciesSelectionMode).toBe(SpeciesSelectionMode.All);
      expect(selection.hierarchyId).toBe('');
      expect(selection.brainRegionId).toBe('');
    });

    it('keeps the per-hierarchy memory it is given so a later switch can restore it', () => {
      const memory = { 'h-mouse': { brainRegionId: 'br-1', brainRegionName: 'Cortex' } };

      expect(createAllSpeciesSelection(memory).perHierarchyMemory).toBe(memory);
    });
  });
});

describe('the stuck-panel fix, end to end through the public helpers', () => {
  function bannerAfterResolving(savedHierarchyId: string) {
    const workspaceHierarchyId = resolveEffectiveHierarchyId({
      remoteHierarchyId: savedHierarchyId,
      storageHierarchyId: savedHierarchyId,
      defaultHierarchyId: 'h-mouse',
      availableHierarchies: available,
    });
    const displaySpecies = resolveDisplayWorkspaceSpecies({
      isAllMode: false,
      workspaceSpecies: null,
      workspaceHierarchyId,
      remoteAvailableHierarchies: available,
    });
    const isLoading = getHierarchyBannerLoading({
      syncSettled: true,
      hasPendingUrlOverride: false,
      isBootstrapLoading: false,
      isRootHierarchyLoading: false,
      isAllMode: false,
      displaySpecies,
    });
    return { workspaceHierarchyId, displaySpecies, isLoading };
  }

  it('recovers a saved hierarchy that was removed by a deploy: resolves to default, species shows, banner stops loading', () => {
    const { workspaceHierarchyId, displaySpecies, isLoading } =
      bannerAfterResolving('h-removed-by-deploy');

    expect(workspaceHierarchyId).toBe('h-mouse');
    expect(displaySpecies?.displayName).toBe('Mouse');
    expect(isLoading).toBe(false);
  });

  it('leaves a still-valid saved hierarchy exactly as it was', () => {
    const { workspaceHierarchyId, displaySpecies, isLoading } = bannerAfterResolving('h-human');

    expect(workspaceHierarchyId).toBe('h-human');
    expect(displaySpecies?.displayName).toBe('Human');
    expect(isLoading).toBe(false);
  });
});
