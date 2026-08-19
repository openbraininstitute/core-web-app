import { describe, expect, it, vi } from 'vitest';

// The loader's SWC module value-imports the viewer barrel, which pulls in tgd — a package
// that touches `document` at module scope.
vi.mock('@/morpho-viewer', async () => ({
  MorphoViewerTreeItemType: (await import('@/features/scan-config/types')).MorphoViewerTreeItemType,
}));

import {
  listBiophysicalPopulations,
  morphologyFileOf,
  resolveMorphologyRule,
} from '@/features/scan-config/components/model-preview/viewer-layout/circuit-loader';

import type { ICircuitSonataConfiguration } from '@/api/entitycore/types/entities/circuit';

/** Mirrors OBI-One's `resolve_morph_path` + the `m_file` assembly in `get_population_nodes`. */

function config(overrides: {
  components?: Record<string, unknown>;
  population?: Record<string, unknown>;
}): ICircuitSonataConfiguration {
  return {
    version: 2,
    node_sets_file: 'node_sets.json',
    components: overrides.components,
    networks: {
      nodes: [
        {
          nodes_file: 'networks/nodes/nodes.h5',
          populations: { All: { type: 'biophysical', ...overrides.population } },
        },
      ],
      edges: [],
    },
  } as unknown as ICircuitSonataConfiguration;
}

describe('resolveMorphologyRule', () => {
  it('uses the population morphologies_dir as SWC files', () => {
    const rule = resolveMorphologyRule(
      config({ population: { morphologies_dir: 'morphologies/swc' } }),
      'All'
    );

    expect(morphologyFileOf(rule, 'cell_042')).toBe('morphologies/swc/cell_042.swc');
  });

  it('falls back to the components morphologies_dir', () => {
    const rule = resolveMorphologyRule(
      config({ components: { morphologies_dir: 'morphologies' } }),
      'All'
    );

    expect(morphologyFileOf(rule, 'a')).toBe('morphologies/a.swc');
  });

  it('resolves a neurolucida-asc alternate to .asc files', () => {
    const rule = resolveMorphologyRule(
      config({ population: { alternate_morphologies: { 'neurolucida-asc': 'morphologies/asc' } } }),
      'All'
    );

    expect(morphologyFileOf(rule, 'a')).toBe('morphologies/asc/a.asc');
  });

  it('resolves any other alternate to .h5 files', () => {
    const rule = resolveMorphologyRule(
      config({ population: { alternate_morphologies: { h5v1: 'morphologies/h5' } } }),
      'All'
    );

    expect(morphologyFileOf(rule, 'a')).toBe('morphologies/h5/a.h5');
  });

  it('treats an alternate path with an extension as one container for every cell', () => {
    const rule = resolveMorphologyRule(
      config({ population: { alternate_morphologies: { h5v1: 'morphologies/merged.h5' } } }),
      'All'
    );

    expect(morphologyFileOf(rule, 'a')).toBe('morphologies/merged.h5');
    expect(morphologyFileOf(rule, 'b')).toBe('morphologies/merged.h5');
  });

  it('prefers morphologies_dir over alternates, like libsonata', () => {
    const rule = resolveMorphologyRule(
      config({
        population: {
          morphologies_dir: 'morphologies/swc',
          alternate_morphologies: { h5v1: 'morphologies/h5' },
        },
      }),
      'All'
    );

    expect(morphologyFileOf(rule, 'a')).toBe('morphologies/swc/a.swc');
  });

  it('throws when the population has no morphology source at all', () => {
    expect(() => resolveMorphologyRule(config({}), 'All')).toThrow(/No morphologies found/);
  });
});

describe('CircuitConfig path resolution', () => {
  it('resolves manifest variables in every path the reader consumes', async () => {
    const { CircuitConfig } = await import(
      '@/features/scan-config/components/model-preview/viewer-layout/circuit-loader/circuit-config'
    );

    const parsed = new CircuitConfig({
      version: 2,
      manifest: { $BASE_DIR: '.' },
      node_sets_file: '$BASE_DIR/node_sets.json',
      components: { morphologies_dir: '$BASE_DIR/morphologies' },
      networks: {
        nodes: [
          {
            nodes_file: '$BASE_DIR/S1/nodes.h5',
            populations: { All: { type: 'biophysical' } },
          },
        ],
        edges: [
          {
            edges_file: '$BASE_DIR/POm__S1__chemical/edges.h5',
            populations: { POm__S1__chemical: { type: 'chemical' } },
          },
        ],
      },
    }).config;

    expect(parsed.networks.nodes[0].nodes_file).toBe('S1/nodes.h5');
    expect(parsed.networks.edges[0].edges_file).toBe('POm__S1__chemical/edges.h5');
    expect(parsed.components?.morphologies_dir).toBe('morphologies');
    expect(parsed.node_sets_file).toBe('node_sets.json');
  });
});

describe('listBiophysicalPopulations', () => {
  function withPopulations(
    nodes: { nodes_file: string; populations: Record<string, { type?: string }> }[]
  ) {
    return { networks: { nodes, edges: [] } } as unknown as ICircuitSonataConfiguration;
  }

  it('orders populations by codepoint, as libsonata enumerates them', () => {
    // `localeCompare` would put "aPop" first in an en locale, shifting every node index.
    const listed = listBiophysicalPopulations(
      withPopulations([{ nodes_file: 'n.h5', populations: { aPop: {}, SG_pop: {} } }])
    );

    expect(listed.map((entry) => entry.populationName)).toEqual(['SG_pop', 'aPop']);
  });

  it('keeps only biophysical populations, defaulting a missing type to biophysical', () => {
    const listed = listBiophysicalPopulations(
      withPopulations([
        {
          nodes_file: 'n.h5',
          populations: { real: { type: 'biophysical' }, virt: { type: 'virtual' }, bare: {} },
        },
      ])
    );

    expect(listed.map((entry) => entry.populationName)).toEqual(['bare', 'real']);
  });

  it('carries each population its own nodes file and config entry', () => {
    const listed = listBiophysicalPopulations(
      withPopulations([
        { nodes_file: 'a.h5', populations: { A: { morphologies_dir: 'morphs/a' } } },
        { nodes_file: 'b.h5', populations: { B: { morphologies_dir: 'morphs/b' } } },
      ] as never)
    );

    expect(listed.map((entry) => entry.nodesFile)).toEqual(['a.h5', 'b.h5']);
    // A name that appears in two files must resolve against its own entry, not the first.
    expect(
      listed.map((entry) =>
        morphologyFileOf(
          resolveMorphologyRule(
            withPopulations([]),
            entry.populationName,
            entry.population as never
          ),
          'cell'
        )
      )
    ).toEqual(['morphs/a/cell.swc', 'morphs/b/cell.swc']);
  });
});
