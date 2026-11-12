import { describe, expect, it } from 'vitest';

import { compileConfigValidator } from '@/features/scan-config/components/hooks';
import {
  toScanConfigForm,
  viewRootElements,
} from '@/features/scan-config/view/workflow-config-view';

import type { ConfigSchema } from '@/features/scan-config/types';

const block = (title: string, extra: object = {}) => ({
  type: 'object',
  title,
  description: '',
  group: 'Setup',
  group_order: 0,
  ui_element: 'block_single',
  ...extra,
});

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['type', 'info', 'initialize'],
  group_order: ['Setup'],
  properties: {
    type: { type: 'string', const: 'DemoScanConfig', default: 'DemoScanConfig' },
    initialize: block('Initialize', {
      properties: { temperature: { anyOf: [{ type: 'number' }, { type: 'array' }] } },
    }),
    info: block('Info', { properties: { campaign_name: { type: 'string' } } }),
    contract_version: block('Contract', { ui_hidden: true }),
  },
} as unknown as ConfigSchema;

const single = {
  obi_one_version: '2026.10.24',
  type: 'DemoSingleConfig',
  idx: 0,
  coordinate_output_root: '/tmp/0',
  scan_output_root: '/tmp',
  single_coordinate_scan_params: { scan_params: [] },
  info: { campaign_name: 'demo' },
  initialize: { temperature: 34 },
  contract_version: {},
};

describe('the workflow config view', () => {
  it('reads a single config as the form of its scan config, which the schema accepts', () => {
    const form = toScanConfigForm(single, schema);

    expect(form).toEqual({
      type: 'DemoScanConfig',
      info: { campaign_name: 'demo' },
      initialize: { temperature: 34 },
      contract_version: {},
    });
    expect(compileConfigValidator(schema)(form)).toBe(true);
  });

  it('rejects the single config as stored', () => {
    expect(compileConfigValidator(schema)(single)).toBe(false);
  });

  it('lists the shown blocks in the config key order, not the schema order', () => {
    expect(viewRootElements(schema, toScanConfigForm(single, schema))).toEqual([
      'info',
      'initialize',
    ]);
  });
});
