import { describe, expect, it } from 'vitest';

import { commonParentRegion, neuronSafeName } from './ion-channel-model-properties';

import type { IBrainRegionHierarchy } from '@/api/entitycore/types/entities/brain-region';

const region = (id: string, children: IBrainRegionHierarchy[] = []) =>
  ({ id, name: id, children }) as unknown as IBrainRegionHierarchy;

const tree = region('root', [
  region('grey', [region('isocortex', [region('ssp')]), region('thalamus')]),
  region('fiber tracts'),
]);

describe('neuronSafeName', () => {
  it.each([
    ['Kv6.2', 'Kv6_2'],
    ['ClC-Ka', 'ClC_Ka'],
    ['5-HT3', '_5_HT3'],
  ])('turns %s into %s', (name, suffix) => {
    expect(neuronSafeName(name)).toBe(suffix);
  });
});

describe('commonParentRegion', () => {
  it('is the region itself when there is only one', () => {
    expect(commonParentRegion(tree, ['ssp', 'ssp'])).toBe('ssp');
  });

  it('is the deepest region containing all of them', () => {
    expect(commonParentRegion(tree, ['ssp', 'thalamus'])).toBe('grey');
    expect(commonParentRegion(tree, ['ssp', 'isocortex'])).toBe('isocortex');
    expect(commonParentRegion(tree, ['grey', 'root'])).toBe('root');
  });

  it('is nothing when a region is outside the hierarchy', () => {
    expect(commonParentRegion(tree, ['ssp', 'elsewhere'])).toBeNull();
  });
});
