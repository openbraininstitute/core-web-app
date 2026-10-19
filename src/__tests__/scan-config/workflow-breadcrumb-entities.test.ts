import { describe, expect, it } from 'vitest';

import { pickBreadcrumbCandidates } from '@/features/scan-config/workflow/breadcrumb';
import { collectEntityRefsFromConfig } from '@/features/scan-config/workflow/workflow-schema-selection';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

const entity = (id: string) => ({
  key: id,
  id,
  type: 'memodel' as TExtendedEntitiesTypeDict,
  name: null,
});

describe('pickBreadcrumbCandidates', () => {
  const [a, b, c, d] = ['a', 'b', 'c', 'd'].map((id) => [entity(id)]);

  it('prefers the live selection, then the stored one, then the campaign, then the primary id', () => {
    expect(pickBreadcrumbCandidates({ published: a, stored: b, fromCampaign: c, primary: d })).toBe(
      a
    );
    expect(
      pickBreadcrumbCandidates({ published: [], stored: b, fromCampaign: c, primary: d })
    ).toBe(b);
    expect(
      pickBreadcrumbCandidates({ published: [], stored: [], fromCampaign: c, primary: d })
    ).toBe(c);
    expect(
      pickBreadcrumbCandidates({ published: [], stored: [], fromCampaign: [], primary: d })
    ).toBe(d);
    expect(
      pickBreadcrumbCandidates({ published: [], stored: [], fromCampaign: [], primary: [] })
    ).toEqual([]);
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
      collectEntityRefsFromConfig({ x: { type: 'SomethingElseFromID', id_str: id1 } })
    ).toEqual([]);
    expect(collectEntityRefsFromConfig(undefined)).toEqual([]);
  });
});
