import cloneDeep from 'es-toolkit/compat/cloneDeep';

import computeModifiedComposition, {
  applyNewDensity,
  calculateDensityRatioChange,
  findParentOfAffected,
  iterateAndApplyDensityChange,
} from '@/util/composition/composition-modifier';
import { calculateNewExtendedNodeId } from '@/util/composition/utils';

import testComposition from './data/test-composition.json';

import type { CalculatedCompositionNode } from '@/types/composition/calculation';
import type { OriginalComposition, OriginalCompositionNode } from '@/types/composition/original';

describe('calculateNewExtendedNodeId', () => {
  it(`should append the new node id if extended exists`, () => {
    const extendedNodeId = 'http://uri.interlex.org/base/ilx_0383192?rev=34';
    const nodeId = 'http://uri.interlex.org/base/ilx_0738203?rev=28';
    const newExtendedNodeId = calculateNewExtendedNodeId(extendedNodeId, nodeId, 'MType');
    expect(newExtendedNodeId).toBe(
      'http://uri.interlex.org/base/ilx_0383192?rev=34__http://uri.interlex.org/base/ilx_0738203?rev=28'
    );
  });

  it(`should be the node id if extended is null`, () => {
    const nodeId = 'http://uri.interlex.org/base/ilx_0738203?rev=28';
    const newExtendedNodeId = calculateNewExtendedNodeId('', nodeId, 'MType');
    expect(newExtendedNodeId).toBe('http://uri.interlex.org/base/ilx_0738203?rev=28');
  });
});

describe('findParentOfAffected', () => {
  // @ts-expect-error
  const testBrainRegion = cloneDeep(
    testComposition.hasPart.brainregion1
  ) as OriginalCompositionNode;
  it('should find the correct node if in the first level of the tree', () => {
    const node = findParentOfAffected('mtype1', testBrainRegion);
    expect(node?.label).toBe('Test Brain Region1');
  });

  it('should find the correct node if in the second level of the tree', () => {
    const node = findParentOfAffected('mtype1__etype1', testBrainRegion);
    expect(node?.label).toBe('MTYPE1');
  });

  it('should find the correct node if in the second level of the tree', () => {
    const node = findParentOfAffected('mtype1__etype2', testBrainRegion);
    expect(node?.label).toBe('MTYPE1');
  });
});

describe('calculateDensityRatioChange', () => {
  it('should have correct ratio when increasing the value', () => {
    const change = calculateDensityRatioChange(300, 600);
    expect(change).toBe(2);
  });

  it('should have correct ratio when decreasing the value', () => {
    const change = calculateDensityRatioChange(600, 300);
    expect(change).toBe(0.5);
  });

  it('should have correct ratio when the previous density is 0', () => {
    const change = calculateDensityRatioChange(0, 300);
    expect(change).toBe(300);
  });
});

describe('applyNewDensity', () => {
  it('should have correct new density applied', () => {
    const nodeToModify = {
      composition: {
        neuron: {
          density: 300,
        },
      },
    } as OriginalCompositionNode;

    applyNewDensity(nodeToModify, 0.5);
    expect(nodeToModify.composition.neuron.density).toBeCloseTo(150);
  });

  it('should have correct new density applied when previous density is 0', () => {
    const nodeToModify = {
      composition: {
        neuron: {
          density: 0,
        },
      },
    } as OriginalCompositionNode;

    applyNewDensity(nodeToModify, 300);
    expect(nodeToModify.composition.neuron.density).toBeCloseTo(300);
  });
});

describe('iterateAndApplyDensityChange', () => {
  it('should calculate correct density change', () => {
    const testBrainRegion = cloneDeep(testComposition.hasPart.brainregion1);
    const copyTestBR = cloneDeep(testBrainRegion);
    // @ts-expect-error
    const mtype1 = copyTestBR.hasPart.mtype1 as OriginalCompositionNode;
    iterateAndApplyDensityChange(mtype1, 0.5, 0.2);
    expect(mtype1.hasPart.etype1.composition.neuron.density).toBeCloseTo(125);
    expect(mtype1.hasPart.etype2.composition.neuron.density).toBeCloseTo(175);
  });
});

describe('computeModifiedComposition', () => {
  it('should calculate the correct overall density change when decreasing value by half', () => {
    // @ts-expect-error
    const copyComposition = cloneDeep(testComposition) as OriginalComposition;
    const modifiedNode = {
      id: 'mtype1',
      composition: 900,
      extendedNodeId: 'mtype1',
    } as CalculatedCompositionNode;
    // @ts-expect-error
    computeModifiedComposition(
      modifiedNode,
      -450,
      ['brainregion1', 'brainregion2'],
      copyComposition,
      'density',
      { brainregion: 0.2 },
      'brainregion'
    );
    expect(
      copyComposition.hasPart.brainregion1.hasPart.mtype1.hasPart.etype1.composition.neuron.density
    ).toBeCloseTo(125);
    expect(
      copyComposition.hasPart.brainregion1.hasPart.mtype1.hasPart.etype2.composition.neuron.density
    ).toBeCloseTo(175);
    expect(
      copyComposition.hasPart.brainregion1.hasPart.mtype2.hasPart.etype3.composition.neuron.density
    ).toBeCloseTo(200);
    expect(
      copyComposition.hasPart.brainregion1.hasPart.mtype3.hasPart.etype4.composition.neuron.density
    ).toBeCloseTo(100);
    expect(
      copyComposition.hasPart.brainregion1.hasPart.mtype3.hasPart.etype5.composition.neuron.density
    ).toBeCloseTo(100);
    // second brain region
    expect(
      copyComposition.hasPart.brainregion2.hasPart.mtype1.hasPart.etype1.composition.neuron.density
    ).toBeCloseTo(50);
    expect(
      copyComposition.hasPart.brainregion2.hasPart.mtype1.hasPart.etype2.composition.neuron.density
    ).toBeCloseTo(100);
    expect(
      copyComposition.hasPart.brainregion2.hasPart.mtype2.hasPart.etype3.composition.neuron.density
    ).toBeCloseTo(200);
  });

  it('should calculate the correct overall density change when increasing value', () => {
    // @ts-expect-error
    const copyComposition = cloneDeep(testComposition) as OriginalComposition;
    const modifiedNode = {
      id: 'mtype1',
      composition: 900,
      extendedNodeId: 'mtype1',
    } as CalculatedCompositionNode;
    // @ts-expect-error
    computeModifiedComposition(
      modifiedNode,
      100,
      ['brainregion1', 'brainregion2'],
      copyComposition,
      'density',
      { brainregion: 0.2 },
      'brainregion'
    );
    expect(
      copyComposition.hasPart.brainregion1.hasPart.mtype1.hasPart.etype1.composition.neuron.density
    ).toBeCloseTo(277.777);
    expect(
      copyComposition.hasPart.brainregion1.hasPart.mtype1.hasPart.etype2.composition.neuron.density
    ).toBeCloseTo(388.888);
    expect(
      copyComposition.hasPart.brainregion1.hasPart.mtype2.hasPart.etype3.composition.neuron.density
    ).toBeCloseTo(200);
    expect(
      copyComposition.hasPart.brainregion1.hasPart.mtype3.hasPart.etype4.composition.neuron.density
    ).toBeCloseTo(100);
    expect(
      copyComposition.hasPart.brainregion1.hasPart.mtype3.hasPart.etype5.composition.neuron.density
    ).toBeCloseTo(100);
    // // second brain region
    expect(
      copyComposition.hasPart.brainregion2.hasPart.mtype1.hasPart.etype1.composition.neuron.density
    ).toBeCloseTo(111.111);
    expect(
      copyComposition.hasPart.brainregion2.hasPart.mtype1.hasPart.etype2.composition.neuron.density
    ).toBeCloseTo(222.222);
    expect(
      copyComposition.hasPart.brainregion2.hasPart.mtype2.hasPart.etype3.composition.neuron.density
    ).toBeCloseTo(200);
  });

  it('should calculate the correct overall density change when decreasing value of second level', () => {
    // @ts-expect-error
    const copyComposition = cloneDeep(testComposition) as OriginalComposition;
    const modifiedNode = {
      id: 'etype2',
      extendedNodeId: 'mtype1__etype2',
      composition: 350,
    } as CalculatedCompositionNode;
    // @ts-expect-error
    computeModifiedComposition(
      modifiedNode,
      -175,
      ['brainregion1'],
      copyComposition,
      'density',
      { brainregion: 0.2 },
      'brainregion'
    );
    expect(
      copyComposition.hasPart.brainregion1.hasPart.mtype1.hasPart.etype1.composition.neuron.density
    ).toBeCloseTo(250);
    expect(
      copyComposition.hasPart.brainregion1.hasPart.mtype1.hasPart.etype2.composition.neuron.density
    ).toBeCloseTo(175);
    expect(
      copyComposition.hasPart.brainregion1.hasPart.mtype2.hasPart.etype3.composition.neuron.density
    ).toBeCloseTo(200);
    expect(
      copyComposition.hasPart.brainregion1.hasPart.mtype3.hasPart.etype4.composition.neuron.density
    ).toBeCloseTo(100);
    expect(
      copyComposition.hasPart.brainregion1.hasPart.mtype3.hasPart.etype5.composition.neuron.density
    ).toBeCloseTo(100);
  });
});
