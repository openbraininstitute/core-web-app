import { resolveCircuitAssetPath } from '@/utils/circuit-manifest';

import type { ICircuitSonataConfiguration } from '@/api/entitycore/types/entities/circuit';

/**
 * SONATA's `alternate_morphologies` keys, mapped to the extension the file
 * carries on disk. Anything unrecognised is HDF5 — the same assumption
 * `libsonata` consumers make, since `neurolucida-asc` is the only non-HDF5
 * format the spec names.
 */
const ALTERNATE_FORMATS: Record<string, TMorphologyFormat> = {
  'neurolucida-asc': 'asc',
  h5v1: 'h5',
};

export type TMorphologyFormat = 'swc' | 'asc' | 'h5';

/** Where a population's morphologies live, and how a node's name maps to a file. */
export type MorphologyLocation = {
  /** Directory holding one file per morphology, or a container holding all of them. */
  path: string;
  format: TMorphologyFormat;
  /**
   * Whether `path` is a container file (`morphologies.h5`) rather than a
   * directory — one path holding every morphology, addressed by name.
   */
  container: boolean;
};

/**
 * Find the morphologies a node population draws from.
 *
 * Mirrors what `libsonata` does for `node_population_properties`, which is what
 * OBI-One's `/circuit/viz/{id}/nodes` resolved on our behalf before the nodes
 * came from the SONATA file directly:
 *
 * 1. `morphologies_dir` wins wherever it is set, and means SWC. A population
 *    entry overrides `components`, but an absent one inherits it — which is why
 *    a population declaring only an ASC alternate still resolves to SWC when
 *    `components.morphologies_dir` exists. That looks wrong and is not: the
 *    population overrode the alternates, not the default directory.
 * 2. Otherwise the first `alternate_morphologies` entry, population before
 *    components. "First" is the order the key appears in `circuit_config.json`,
 *    which `JSON.parse` preserves.
 *
 * Returns null when the population declares no morphologies at all — a virtual
 * or point-neuron population, which has nothing to draw.
 */
export function resolveMorphologyLocation(
  config: ICircuitSonataConfiguration,
  populationName: string
): MorphologyLocation | null {
  const population = findPopulation(config, populationName);
  const components = config.components;

  const directory = population?.morphologies_dir || components?.morphologies_dir;
  if (directory) return locate(config, directory, 'swc');

  const alternates =
    firstEntry(population?.alternate_morphologies) ??
    firstEntry(components?.alternate_morphologies);
  if (alternates) {
    const [key, path] = alternates;
    return locate(config, path, ALTERNATE_FORMATS[key] ?? 'h5');
  }

  return null;
}

/**
 * The path a node's morphology is served under, relative to the circuit's
 * SONATA directory — the `{morphology_file}` segment of OBI-One's
 * `/circuit/viz/{id}/morphologies/{morphology_file}`.
 */
export function morphologyFileOf(location: MorphologyLocation, morphologyName: string): string {
  if (location.container) return location.path;
  return `${location.path}/${morphologyName}.${location.format}`;
}

function locate(
  config: ICircuitSonataConfiguration,
  rawPath: string,
  format: TMorphologyFormat
): MorphologyLocation {
  const path = resolveCircuitAssetPath(rawPath, config.manifest);
  return { path, format, container: hasExtension(path) };
}

/** A trailing `.ext` on the last segment is what tells a container from a directory. */
function hasExtension(path: string): boolean {
  const name = path.split('/').pop() ?? '';
  return /\.[^.]+$/.test(name);
}

function firstEntry(record: Record<string, string> | undefined): [string, string] | null {
  for (const [key, value] of Object.entries(record ?? {})) {
    if (value) return [key, value];
  }
  return null;
}

function findPopulation(config: ICircuitSonataConfiguration, populationName: string) {
  for (const node of config.networks?.nodes ?? []) {
    const population = node.populations?.[populationName];
    if (population) return population;
  }
  return undefined;
}
