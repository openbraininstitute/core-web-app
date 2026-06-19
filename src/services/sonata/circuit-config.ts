import { assertType } from '@/util/type-guards';
import { logError } from '@/utils/logger';

import { bubbleError } from './utils';

import type { ICircuitSonataConfiguration } from '@/api/entitycore/types/entities/circuit';

export class CircuitConfig {
  public readonly config: ICircuitSonataConfiguration;
  public readonly vars: Record<string, string> = {};

  constructor(content: unknown) {
    try {
      assertICircuitSonataConfiguration(content);
      this.config = structuredClone(content);
      const manifest = this.config.manifest ?? {};
      for (const varName of Object.keys(manifest)) {
        const value = this.resolvePath(manifest[varName]);
        this.vars[varName] = value;
        manifest[varName] = value;
      }
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
    } catch (ex) {
      bubbleError(ex, 'while parsing circuit config.');
    }
  }

  private resolvePath(path: string) {
    try {
      const { vars } = this; // this.config.manifest ?? {};
      const parts = (path ?? '')
        .split('/')
        .map((part) => {
          const value = vars[part];
          return value ?? part;
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
    } catch (ex) {
      bubbleError(ex, `while resolving path for "${path}".`);
    }
  }
}

function assertICircuitSonataConfiguration(
  data: unknown
): asserts data is ICircuitSonataConfiguration {
  try {
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
              provenance: ['?', { id_mapping: ['?', 'string'] }],
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
                    type: 'string',
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
      '[circuit_config.json]'
    );
    if (typeof data.version !== 'number') {
      data.version = 0;
    }
    if (data.components) {
      if (!data.components.provenance) data.components.provenance = { id_mapping: '' };
      else if (!data.components.provenance.id_mapping) {
        data.components.provenance.id_mapping = '';
      }
    }
  } catch (ex) {
    logError('Invalid format for circuit config:', data);
    logError(ex);
    bubbleError(ex, 'while checking format of circuit config.');
  }
}
