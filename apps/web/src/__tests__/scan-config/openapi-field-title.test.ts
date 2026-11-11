import { describe, expect, it } from 'vitest';

import { dereferenceObiOneOpenApi } from '@/features/scan-config/components/hooks/schema';

/**
 * Mirrors OpenAPI shape: a bare `$ref` to `MEModelFromID` is crawled first
 * (ME-model simulation / EM mapping), then synaptome's Field title sits next
 * to the same `$ref`. Ion-channel FromID is only used with Field extras.
 */
const openApiFragment = {
  components: {
    schemas: {
      EMSynapseMappingInputNamedTuple: {
        properties: {
          elements: {
            items: {
              anyOf: [{ $ref: '#/components/schemas/MEModelFromID' }],
            },
          },
        },
      },
      MEModelFromID: {
        title: 'MEModelFromID',
        type: 'object',
        properties: {
          type: { const: 'MEModelFromID' },
          id_str: { type: 'string' },
        },
      },
      IonChannelModelFromID: {
        title: 'IonChannelModelFromID',
        type: 'object',
        properties: {
          type: { const: 'IonChannelModelFromID' },
          id_str: { type: 'string' },
        },
      },
      IonChannelModelWithConductance: {
        properties: {
          ion_channel_model: {
            $ref: '#/components/schemas/IonChannelModelFromID',
            title: 'Ion channel model',
            description: 'ID of the model to simulate.',
            ui_element: 'model_selector_single',
          },
        },
      },
      Initialize: {
        properties: {
          me_model: {
            $ref: '#/components/schemas/MEModelFromID',
            title: 'Postsynaptic ME-model',
            description: 'Existing single-cell ME-model.',
            ui_element: 'model_identifier',
          },
        },
      },
    },
  },
};

describe('dereferenceObiOneOpenApi', () => {
  it('keeps Field title and description next to $ref after a bare $ref to the same class', async () => {
    const dereferenced = await dereferenceObiOneOpenApi(openApiFragment);
    const meModel = (dereferenced as typeof openApiFragment).components.schemas.Initialize
      .properties.me_model;
    const ionChannel = (dereferenced as typeof openApiFragment).components.schemas
      .IonChannelModelWithConductance.properties.ion_channel_model;

    expect(meModel.title).toBe('Postsynaptic ME-model');
    expect(meModel.description).toBe('Existing single-cell ME-model.');
    expect(meModel.ui_element).toBe('model_identifier');

    expect(ionChannel.title).toBe('Ion channel model');
    expect(ionChannel.description).toBe('ID of the model to simulate.');
    expect(ionChannel.ui_element).toBe('model_selector_single');
  });
});
