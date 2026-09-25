import { describe, expect, it } from 'vitest';

import {
  makeRegionEntry,
  pruneRegionsToModelIds,
  withoutEmptyRegions,
} from '@/features/scan-config/components/ui-blocks/emodel-optimisation/mechanism-regions';

import type { Config, ConfigSchema } from '@/features/scan-config/types';

const schema = {
  properties: {
    info: { ui_element: 'block_single' },
    emodel_optimisation_parameters: { ui_element: 'emodel_optimisation_parameters' },
  },
} as unknown as ConfigSchema;

describe('withoutEmptyRegions', () => {
  it('drops the regions emptied by an unassignment and keeps everything else', () => {
    const models = [{ type: 'IonChannelModelFromID', id_str: 'icm-1' }];
    const somatic = [makeRegionEntry('icm-1')];
    const config: Config = {
      info: { campaign_name: 'c' },
      emodel_optimisation_parameters: {
        mechanisms: { ion_channel_models: models, mechanism_regions: { all: [], somatic } },
        global_parameters: {},
      },
    };

    expect(withoutEmptyRegions(config, schema)).toEqual({
      info: { campaign_name: 'c' },
      emodel_optimisation_parameters: {
        mechanisms: { ion_channel_models: models, mechanism_regions: { somatic } },
        global_parameters: {},
      },
    });
  });

  it('leaves configs without an emodel optimisation element unchanged', () => {
    const config: Config = { info: { campaign_name: 'c' } };

    expect(withoutEmptyRegions(config, schema)).toEqual(config);
  });
});

describe('pruneRegionsToModelIds', () => {
  it('removes a region whose only model was removed', () => {
    const somatic = [makeRegionEntry('icm-1'), makeRegionEntry('icm-2')];
    const mechanisms = { mechanism_regions: { axonal: [makeRegionEntry('icm-2')], somatic } };

    expect(pruneRegionsToModelIds(mechanisms, new Set(['icm-1']))).toEqual({
      mechanism_regions: { somatic: [makeRegionEntry('icm-1')] },
    });
  });
});
