import { describe, expect, it } from 'vitest';

import { pickBreadcrumbCandidates } from '@/features/scan-config/workflow/breadcrumb';
import {
  collectEntityRefsFromConfig,
  resolveWorkflowEntityRefs,
} from '@/features/scan-config/workflow/workflow-schema-selection';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { Config, ConfigSchema } from '@/features/scan-config/types';

const entity = (id: string) => ({
  key: id,
  id,
  type: 'memodel' as TExtendedEntitiesTypeDict,
  name: null,
});

describe('pickBreadcrumbCandidates', () => {
  const [a, b, c, d] = ['a', 'b', 'c', 'd'].map((id) => [entity(id)]);

  it('takes the live config when an editor is mounted, even when it is empty', () => {
    expect(
      pickBreadcrumbCandidates({
        live: a,
        stored: b,
        fromCampaign: c,
        primary: d,
      })
    ).toBe(a);
    // a cleared field must not fall back to the stale session pick
    expect(
      pickBreadcrumbCandidates({
        live: [],
        stored: b,
        fromCampaign: c,
        primary: d,
      })
    ).toEqual([]);
  });

  it('without an editor: the stored selection, then the campaign, then the primary id', () => {
    expect(
      pickBreadcrumbCandidates({
        live: null,
        stored: b,
        fromCampaign: c,
        primary: d,
      })
    ).toBe(b);
    expect(
      pickBreadcrumbCandidates({
        live: null,
        stored: [],
        fromCampaign: c,
        primary: d,
      })
    ).toBe(c);
    expect(
      pickBreadcrumbCandidates({
        live: null,
        stored: [],
        fromCampaign: [],
        primary: d,
      })
    ).toBe(d);
    expect(
      pickBreadcrumbCandidates({
        live: null,
        stored: [],
        fromCampaign: [],
        primary: [],
      })
    ).toEqual([]);
  });
});

describe('resolveWorkflowEntityRefs', () => {
  const primaryId = '37061af2-2fb6-4808-984b-93618bf8e385';
  const otherId = '47061af2-2fb6-4808-984b-93618bf8e385';
  const config = {
    initialize: { memodel: [{ type: 'MEModelFromID', id_str: primaryId }] },
    mechanisms: {
      ion_channel_models: [{ type: 'IonChannelModelFromID', id_str: otherId }],
    },
  } as unknown as Config;
  const withInitializeField = {
    properties: {
      initialize: {
        ui_element: 'block_single',
        properties: { memodel: { ui_element: 'model_identifier_multiple' } },
      },
    },
  } as unknown as ConfigSchema;

  it("reads only the schema's initialize model field, so other pickers never take over", () => {
    expect(resolveWorkflowEntityRefs(withInitializeField, config).map((r) => r.id_str)).toEqual([
      primaryId,
    ]);
  });

  it('returns nothing once that field is cleared', () => {
    expect(
      resolveWorkflowEntityRefs(withInitializeField, {
        ...config,
        initialize: {},
      } as Config)
    ).toEqual([]);
  });

  it('collects every entity ref when the schema has no initialize model field', () => {
    expect(
      resolveWorkflowEntityRefs({ properties: {} } as unknown as ConfigSchema, config).map(
        (r) => r.id_str
      )
    ).toEqual([primaryId, otherId]);
  });
});

describe('collectEntityRefsFromConfig', () => {
  const id1 = '17061af2-2fb6-4808-984b-93618bf8e385';
  const id2 = '27061af2-2fb6-4808-984b-93618bf8e385';

  it('finds entity refs anywhere in a saved config (not only under initialize), deduped', () => {
    const config = {
      initialize: { type: 'X.Initialize', temperature: 34 },
      ion_channel_models: {
        'Ion channel model 0': {
          ion_channel_model: { type: 'IonChannelModelFromID', id_str: id1 },
        },
        'Ion channel model 1': [{ type: 'IonChannelModelFromID', id_str: id1 }],
      },
      other: [{ type: 'MEModelFromID', id_str: id2 }],
    };
    expect(collectEntityRefsFromConfig(config).map((ref) => ref.id_str)).toEqual([id1, id2]);
  });

  it('ignores refs of unknown kinds and configs without refs', () => {
    expect(
      collectEntityRefsFromConfig({
        x: { type: 'SomethingElseFromID', id_str: id1 },
      })
    ).toEqual([]);
    expect(collectEntityRefsFromConfig(undefined)).toEqual([]);
  });
});
