import { assertType } from '@/util/type-guards';

import type { ICircuitSonataConfiguration } from '@/api/entitycore/types/entities/circuit';

export class CircuitConfig {
  public readonly config: ICircuitSonataConfiguration;

  constructor(content: unknown) {
    assertICircuitSonataConfiguration(content);
    this.config = structuredClone(content);
    const { components } = this.config;
    if (components) {
      components.morphologies_dir = this.resolvePath(components.morphologies_dir);
    }
    for (const node of this.config.networks.nodes) {
      node.nodes_file = this.resolvePath(node.nodes_file);
      for (const key of Object.keys(node.populations)) {
        const population = node.populations[key];
        if (population.morphologies_dir) {
          population.morphologies_dir = this.resolvePath(population.morphologies_dir);
        }
      }
    }
    this.config.node_sets_file = this.resolvePath(this.config.node_sets_file);
  }

  private resolvePath(path: string) {
    const manifest = this.config.manifest ?? {};
    const parts = (path ?? '')
      .split('/')
      .map((part) => {
        const value = manifest[part];
        return value ? value : part;
      })
      .join('/')
      .split('/')
      .filter((item) => !!item);
    const result: string[] = [];
    for (const part of parts) {
      if (typeof part !== 'string' || part.trim().length === 0 || part === '.') continue;

      if (part === '..') {
        if (result.length > 0) {
          result.pop();
        }
        continue;
      }

      result.push(part);
    }
    return result.join('/');
  }
}

function assertICircuitSonataConfiguration(
  data: unknown
): asserts data is ICircuitSonataConfiguration {
  assertType<ICircuitSonataConfiguration>(
    data,
    {
      version: ['?', 'number'],
      manifest: ['?', ['map', 'string']],
      node_sets_file: ['?', 'string'],
      components: [
        '?',
        [
          'partial',
          {
            biophysical_neuron_models_dir: 'string',
            mechanisms_dir: 'string',
            morphologies_dir: 'string',
            point_neuron_models_dir: 'string',
            provenance: { id_mapping: 'string' },
            synaptic_models_dir: 'string',
            templates_dir: 'string',
            alternate_morphologies: ['map', 'string'],
          },
        ],
      ],
      networks: {
        nodes: [
          'array',
          {
            nodes_file: 'string',
            populations: [
              'map',
              [
                'partial',
                {
                  type: ['literal', 'biophysical', 'virtual'],
                  biophysical_neuron_models_dir: 'string',
                  morphologies_dir: 'string',
                  alternate_morphologies: ['map', 'string'],
                },
              ],
            ],
          },
        ],
        edges: [
          'array',
          {
            edges_file: 'string',
            populations: ['map', { type: 'string' }],
          },
        ],
      },
    },
    'circuit_config.json/'
  );
  if (typeof data.version !== 'number') {
    data.version = 0;
  }
}
