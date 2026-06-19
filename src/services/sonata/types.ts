import { assertType } from '@/util/type-guards';

export interface SonataPopulation {
  name: string;
  nodeIds: number[];
  files: string[];
}

export interface SonataNode {
  morphologyId: string;
  position: [number, number, number];
}

type SonataNodeSet = {
  population: string;
  node_id?: number[];
};

export type SonataNodeSets = Record<string, SonataNodeSet>;

export function assertNodeSets(
  data: unknown,
  prefix = 'node_sets.json'
): asserts data is SonataNodeSets {
  assertType<SonataNodeSets>(data, ['map', { node_id: ['?', ['array', 'number']] }], prefix);
}
