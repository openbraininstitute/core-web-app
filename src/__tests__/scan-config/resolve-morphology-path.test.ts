import { describe, expect, it } from 'vitest';

import {
  morphologyFileOf,
  resolveMorphologyLocation,
} from '@/features/scan-config/components/circuit-viz/sources/resolve-morphology-path';

import type { ICircuitSonataConfiguration } from '@/api/entitycore/types/entities/circuit';

type PopulationConfig = {
  morphologies_dir?: string;
  alternate_morphologies?: Record<string, string>;
};

function makeConfig({
  components = {},
  population = {},
  manifest,
}: {
  components?: PopulationConfig;
  population?: PopulationConfig;
  manifest?: Record<string, string>;
}): ICircuitSonataConfiguration {
  return {
    manifest: manifest ?? {},
    components,
    networks: {
      edges: [],
      nodes: [
        { nodes_file: 'nodes.h5', populations: { All: { type: 'biophysical', ...population } } },
      ],
    },
    node_sets_file: 'node_sets.json',
    version: 2,
  } as unknown as ICircuitSonataConfiguration;
}

describe('resolveMorphologyLocation', () => {
  it("reads the population's own morphologies_dir as SWC", () => {
    const config = makeConfig({ population: { morphologies_dir: 'morphologies/ascii' } });

    expect(resolveMorphologyLocation(config, 'All')).toEqual({
      path: 'morphologies/ascii',
      format: 'swc',
      container: false,
    });
  });

  it('falls back to the components default when the population declares none', () => {
    const config = makeConfig({ components: { morphologies_dir: 'shared/morphologies' } });

    expect(resolveMorphologyLocation(config, 'All')?.path).toBe('shared/morphologies');
  });

  // libsonata merges the components default into every population, so a
  // population that overrides only the alternates still inherits the SWC
  // directory — and inheriting it means SWC wins.
  it('prefers an inherited morphologies_dir over a population alternate', () => {
    const config = makeConfig({
      components: { morphologies_dir: 'shared/morphologies' },
      population: { alternate_morphologies: { 'neurolucida-asc': 'morphologies/asc' } },
    });

    expect(resolveMorphologyLocation(config, 'All')).toMatchObject({
      path: 'shared/morphologies',
      format: 'swc',
    });
  });

  it('maps neurolucida-asc to .asc when no morphologies_dir exists', () => {
    const config = makeConfig({
      population: { alternate_morphologies: { 'neurolucida-asc': 'morphologies/asc' } },
    });

    expect(resolveMorphologyLocation(config, 'All')).toEqual({
      path: 'morphologies/asc',
      format: 'asc',
      container: false,
    });
  });

  it('treats any other alternate format as HDF5', () => {
    const config = makeConfig({
      population: { alternate_morphologies: { h5v1: 'morphologies/h5' } },
    });

    expect(resolveMorphologyLocation(config, 'All')?.format).toBe('h5');
  });

  it('takes the population alternates over the components ones', () => {
    const config = makeConfig({
      components: { alternate_morphologies: { h5v1: 'shared/h5' } },
      population: { alternate_morphologies: { 'neurolucida-asc': 'own/asc' } },
    });

    expect(resolveMorphologyLocation(config, 'All')).toMatchObject({
      path: 'own/asc',
      format: 'asc',
    });
  });

  it('recognises a container file by its extension', () => {
    const config = makeConfig({
      population: { alternate_morphologies: { h5v1: 'morphologies/merged.h5' } },
    });

    expect(resolveMorphologyLocation(config, 'All')).toEqual({
      path: 'morphologies/merged.h5',
      format: 'h5',
      container: true,
    });
  });

  it('resolves manifest variables and normalises the path', () => {
    const config = makeConfig({
      manifest: { $BASE_DIR: '.', $COMPONENTS: '$BASE_DIR/components' },
      population: { morphologies_dir: '$COMPONENTS/../components/morphologies' },
    });

    expect(resolveMorphologyLocation(config, 'All')?.path).toBe('components/morphologies');
  });

  it('returns null when the population declares no morphologies at all', () => {
    expect(resolveMorphologyLocation(makeConfig({}), 'All')).toBeNull();
  });

  it('returns null for a population the config does not describe', () => {
    const config = makeConfig({ population: { morphologies_dir: 'morphologies' } });

    // No components default to inherit, so an unknown population resolves to nothing.
    expect(resolveMorphologyLocation(config, 'Missing')).toBeNull();
  });
});

describe('morphologyFileOf', () => {
  it('appends the name and format inside a directory', () => {
    expect(
      morphologyFileOf({ path: 'morphologies/asc', format: 'asc', container: false }, 'C060114A2')
    ).toBe('morphologies/asc/C060114A2.asc');
  });

  it('addresses a container by its own path, not by filename', () => {
    expect(
      morphologyFileOf(
        { path: 'morphologies/merged.h5', format: 'h5', container: true },
        'C060114A2'
      )
    ).toBe('morphologies/merged.h5');
  });
});
