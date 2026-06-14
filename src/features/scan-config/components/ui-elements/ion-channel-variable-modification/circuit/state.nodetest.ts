import type { Config } from '@/features/scan-config/types';

const assert: typeof import('node:assert/strict') = require('node:assert/strict');
const fs: typeof import('node:fs') = require('node:fs');
const Module: typeof import('node:module') = require('node:module');
const path: typeof import('node:path') = require('node:path');
const test: typeof import('node:test') = require('node:test');
const ts: typeof import('typescript') = require('typescript');
const { describe, it } = test;

type NodeModuleConstructor = typeof Module & {
  _nodeModulePaths(from: string): string[];
};
type TranspiledModule = InstanceType<typeof Module> & {
  _compile(code: string, filename: string): void;
};

const ScanConfigUIElementDict = {
  BlockSingle: 'block_single',
  BlockDictionary: 'block_dictionary',
  BlockUnion: 'block_union',
  Reference: 'reference',
  IonChannelVariableModificationByNeuron: 'ion_channel_variable_modification_by_neuron',
  ionChannelVariableModificationBySectionList: 'ion_channel_variable_modification_by_section_list',
} as const;

function loadStateHelpers(): typeof import('./state') {
  const statePath = path.join(__dirname, 'state.ts');
  const source = fs.readFileSync(statePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const NodeModule = Module as NodeModuleConstructor;
  const stateModule = new NodeModule(statePath, module) as TranspiledModule;

  stateModule.filename = statePath;
  stateModule.paths = NodeModule._nodeModulePaths(path.dirname(statePath));
  stateModule.require = ((id: string) => {
    if (id === '../../../utils') {
      return {
        isPlainObject: (value: unknown) =>
          typeof value === 'object' && value !== null && !Array.isArray(value),
      };
    }

    if (id === '../../../../types') {
      return {
        isType: (value: unknown) =>
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value) &&
          'const' in value &&
          !('ui_element' in value),
        ScanConfigUIElementDict,
      };
    }

    return require(id);
  }) as NodeJS.Require;

  stateModule._compile(output, statePath);
  return stateModule.exports;
}

const stateHelpers = loadStateHelpers();
const { clearDeletedBlockReferences, resolveNeuronSet } = stateHelpers;

describe('circuit ion-channel manipulation state', () => {
  it('changes the target signature when the referenced neuron-set content changes', () => {
    const firstConfig: Config = {
      neuron_sets: {
        selected: {
          type: 'NeuronSet',
          population: 'S1',
          node_id: [1, 2],
        },
      },
    };
    const secondConfig: Config = {
      neuron_sets: {
        selected: {
          type: 'NeuronSet',
          population: 'S1',
          node_id: [1, 2, 3],
        },
      },
    };
    const reference = {
      block_name: 'selected',
      block_dict_name: 'neuron_sets',
    };

    assert.notEqual(
      resolveNeuronSet(firstConfig, reference).signature,
      resolveNeuronSet(secondConfig, reference).signature
    );
  });

  it('clears a circuit manipulation when its referenced neuron-set entry is deleted', () => {
    const schema = {
      properties: {
        initialize: {
          ui_element: ScanConfigUIElementDict.BlockSingle,
          properties: {
            type: { const: 'Initialize', default: 'Initialize' },
            neuron_set: {
              ui_element: ScanConfigUIElementDict.Reference,
              reference_type: 'NeuronSet',
              title: 'Neuron set',
              description: '',
            },
            manipulation: {
              ui_element: ScanConfigUIElementDict.ionChannelVariableModificationBySectionList,
              property_source_field: 'neuron_set',
              title: 'Manipulation',
              description: '',
              type: 'object',
              properties: {
                type: {
                  const: 'BySectionListModification',
                  default: 'BySectionListModification',
                },
              },
            },
          },
        },
        neuron_sets: {
          ui_element: ScanConfigUIElementDict.BlockDictionary,
          additionalProperties: {
            oneOf: [
              {
                properties: {
                  type: { const: 'NeuronSet', default: 'NeuronSet' },
                },
              },
            ],
          },
        },
      },
    } as unknown as Parameters<typeof clearDeletedBlockReferences>[1];
    const config: Config = {
      initialize: {
        type: 'Initialize',
        neuron_set: {
          block_name: 'target-set',
          block_dict_name: 'neuron_sets',
        },
        manipulation: {
          type: 'BySectionListModification',
          ion_channel_id: 'channel-1',
          variable_name: 'gbar',
        },
      },
      neuron_sets: {
        'target-set': {
          type: 'NeuronSet',
        },
      },
    };

    const next = clearDeletedBlockReferences(config, schema, 'neuron_sets', 'target-set');

    assert.deepEqual(next.initialize, {
      type: 'Initialize',
      neuron_set: null,
      manipulation: null,
    });
  });
});
