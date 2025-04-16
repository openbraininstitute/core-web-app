import { expect, describe, it, vi, beforeEach } from 'vitest';
import {
  resolveExploreDetailsPageUrl,
  resolveProjectUrl,
  resolveLibraryUrl,
} from '../../src/utils/url-builder';
import { DataType } from '@/constants/explore-section/list-views';

// Mock the getEntityByLegacyType helper function
vi.mock('@/entity-configuration/domain/helpers', () => ({
  getEntityByLegacyType: vi.fn(({ legacyType }) => {
    if (legacyType === DataType.ExperimentalNeuronMorphology) {
      return {
        slug: 'morphology',
        explore: { routePrefix: 'interactive/experimental' },
      };
    }
    if (legacyType === DataType.CircuitEModel) {
      return {
        slug: 'e-model',
        explore: { routePrefix: 'model' },
      };
    }
    if (legacyType === DataType.SingleNeuronSimulation) {
      return {
        slug: 'simulation',
        explore: { routePrefix: 'simulate' },
      };
    }
    return null;
  }),
}));

describe('URL Builder Utils', () => {
  const workspaceContext = {
    virtualLabId: 'virtual-lab-1',
    projectId: 'project-1',
  };

  describe('resolveExploreDetailsPageUrl', () => {
    it('should build URL for morphology without workspace context', () => {
      const url = resolveExploreDetailsPageUrl({
        entityId: 'entity-123',
        dataType: DataType.ExperimentalNeuronMorphology,
      });
      expect(url).toBe('/app/virtual-lab/explore/interactive/experimental/morphology/entity-123');
    });

    it('should build URL for morphology with workspace context', () => {
      const url = resolveExploreDetailsPageUrl({
        ctx: workspaceContext,
        entityId: 'entity-123',
        dataType: DataType.ExperimentalNeuronMorphology,
      });
      expect(url).toBe(
        '/app/virtual-lab/lab/virtual-lab-1/project/project-1/explore/interactive/experimental/morphology/entity-123'
      );
    });
    // TODO: add tests when we have emodel type mapper
    // it('should build URL for e-model', () => {
    //     const url = resolveExploreDetailsPageUrl({
    //         entityId: 'entity-456',
    //         dataType: DataType.CircuitEModel,
    //     });
    //     expect(url).toBe('/app/virtual-lab/explore/model/e-model/entity-456');
    // });

    // it('should build URL for simulation with view suffix', () => {
    //     const url = resolveExploreDetailsPageUrl({
    //         entityId: 'entity-789',
    //         dataType: DataType.SingleNeuronSimulation
    //     });
    //     expect(url).toBe('/app/virtual-lab/explore/simulate/simulation/view/entity-789');
    // });
  });

  describe('resolveProjectUrl', () => {
    it('should build project URL', () => {
      const url = resolveProjectUrl(workspaceContext);
      expect(url).toBe('/app/virtual-lab/lab/virtual-lab-1/project/project-1');
    });
  });

  describe('resolveLibraryUrl', () => {
    it('should build library URL without query parameters', () => {
      const url = resolveLibraryUrl({ ctx: workspaceContext });
      expect(url).toBe('/app/virtual-lab/lab/virtual-lab-1/project/project-1/library');
    });

    it('should build library URL with category', () => {
      const url = resolveLibraryUrl({
        ctx: workspaceContext,
        category: 'experimental',
        dataType: DataType.ExperimentalNeuronMorphology,
      });
      expect(url).toBe(
        '/app/virtual-lab/lab/virtual-lab-1/project/project-1/library?c=experimental&t=experimental-neuron-morphology'
      );
    });

    it('should build library URL with data type', () => {
      const url = resolveLibraryUrl({
        ctx: workspaceContext,
        dataType: DataType.ExperimentalNeuronMorphology,
      });
      expect(url).toBe(
        '/app/virtual-lab/lab/virtual-lab-1/project/project-1/library?t=experimental-neuron-morphology'
      );
    });

    it('should build library URL with both category and data type', () => {
      const url = resolveLibraryUrl({
        ctx: workspaceContext,
        category: 'experimental',
        dataType: DataType.ExperimentalNeuronMorphology,
      });
      expect(url).toContain('/app/virtual-lab/lab/virtual-lab-1/project/project-1/library?');
      expect(url).toContain('c=experimental');
      expect(url).toContain('t=experimental-neuron-morphology');
    });
  });
});
