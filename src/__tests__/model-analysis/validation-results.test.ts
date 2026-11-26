import { describe, expect, it } from 'vitest';

import { EntityTypeDict } from '@/api/entitycore/types';
import { flattenValidationResults, isThumbnailResult } from '@/features/model-analysis/helpers';
import { getDocumentation } from '@/features/model-analysis/viewer/container/hooks/dictionary';

import type { TValidationResultNonUndefined } from '@/features/model-analysis/explorer/use-analysis';

const PDF = 'application/pdf';

type TFixtureAsset = { id: string; path: string; content_type: string };

function makeResult(
  id: string,
  name: string,
  assets: TFixtureAsset[],
  description?: string | null
): TValidationResultNonUndefined[number] {
  return {
    id,
    name,
    description,
    passed: true,
    assets,
    error: null,
  } as unknown as TValidationResultNonUndefined[number];
}

const DESCRIPTION =
  'Injects into the soma: 2000 ms at 0.2 nA. Passes if the eFEL feature Spikecount is greater than 0.';

describe('isThumbnailResult', () => {
  it('matches the thumbnail by name, ignoring case and surrounding spaces', () => {
    expect(isThumbnailResult({ name: 'thumbnail' })).toBe(true);
    expect(isThumbnailResult({ name: ' Thumbnail ' })).toBe(true);
  });

  it('keeps other results', () => {
    expect(isThumbnailResult({ name: 'spiking' })).toBe(false);
    expect(isThumbnailResult({ name: 'thumbnail_zoomed' })).toBe(false);
  });
});

describe('flattenValidationResults', () => {
  it('puts the description on every card of a result with several figures', () => {
    const ais = makeResult(
      'r1',
      'AIS spiking',
      [
        { id: 'a1', path: 'ais_spiking.pdf', content_type: PDF },
        { id: 'a2', path: 'ais_spiking_zoomed.pdf', content_type: PDF },
      ],
      DESCRIPTION
    );

    const cards = flattenValidationResults([ais], undefined, EntityTypeDict.Memodel);

    expect(cards).toHaveLength(2);
    expect(cards.map((card) => card.resultDescription)).toEqual([DESCRIPTION, DESCRIPTION]);
  });

  it('puts the description on the Input Resistance card next to the Rin value', () => {
    const rin = makeResult(
      'r2',
      'Memodel input resistance validation',
      [{ id: 'a3', path: 'inputresistancevalidation.json', content_type: 'application/json' }],
      `  ${DESCRIPTION}  `
    );

    const [card] = flattenValidationResults([rin], 142.314, EntityTypeDict.Memodel);

    expect(card.name).toBe('Input Resistance Validation');
    expect(card.resultDescription).toBe(DESCRIPTION);
    expect(card.extraVariables).toEqual({ Rin: { value: '142.31', unit: 'MΩ' } });
  });

  it.each([
    ['empty', ''],
    ['whitespace-only', '   '],
    ['null', null],
    ['missing', undefined],
  ])('falls back to the fixed text when the description is %s', (_, description) => {
    const spiking = makeResult(
      'r3',
      'Spiking',
      [{ id: 'a4', path: 'spiking.pdf', content_type: PDF }],
      description
    );

    const [card] = flattenValidationResults([spiking], undefined, EntityTypeDict.Memodel);

    expect(card.resultDescription).toBeUndefined();
    expect(card.documentation).toEqual(getDocumentation('spiking.pdf', EntityTypeDict.Memodel));
    expect(card.documentation).toBeDefined();
  });

  it('keeps the description of a figure that has no fixed text', () => {
    const rebound = makeResult(
      'r4',
      'Rebound burst',
      [{ id: 'a5', path: 'rebound_burst_hold-65mV.pdf', content_type: PDF }],
      DESCRIPTION
    );

    const [card] = flattenValidationResults([rebound], undefined, EntityTypeDict.Memodel);

    expect(card.documentation).toBeUndefined();
    expect(card.resultDescription).toBe(DESCRIPTION);
  });
});
