import { atom } from 'jotai';
import cloneDeep from 'lodash/cloneDeep';
import filter from 'lodash/filter';

import { idAtom } from '../brain-model-config';

import sessionAtom from '@/state/session';
import calculateCompositions from '@/util/composition/composition-parser';
import computeModifiedComposition from '@/util/composition/composition-modifier';
import { extendCompositionWithOverrideProps } from '@/util/brain-hierarchy';
import { setCompositionPayloadConfigurationAtom } from '@/state/brain-model-config/cell-composition/extra';
import { configPayloadAtom } from '@/state/brain-model-config/cell-composition';
import { getCompositionData } from '@/api/ontologies';
import {
  brainRegionOntologyVolumesAtom,
  densityOrCountAtom,
  selectedBrainRegionAtom,
} from '@/state/brain-regions';
import {
  compositionHistoryAtom,
  compositionHistoryIndexAtom,
} from '@/state/build-composition/composition-history';
import { OriginalComposition } from '@/types/composition/original';
import { AnalysedComposition, CalculatedCompositionNode } from '@/types/composition/calculation';
import { MModelMenuItem } from '@/types/m-model';
import { EModelMenuItem, MEModelMenuItem } from '@/types/e-model';
import { defaultModelRelease } from '@/config';

// This holds a weak reference to the updatedComposition by it's initial composition
// This allows GC to dispose the object once it is no longer used by current components
const updatedCompositionWeakMapAtom = atom<WeakMap<OriginalComposition, OriginalComposition>>(
  new WeakMap()
);

const initialCompositionAtom = atom<Promise<OriginalComposition | null>>(async (get) => {
  const session = get(sessionAtom);
  const releaseId = get(idAtom);
  if (!session) return null;
  // When using the default model release, the composition data should be fetched instead of using the data of the configuration.
  // In that way we make sure that the latest version is being used and not the stored in the config
  if (releaseId !== defaultModelRelease.id) {
    try {
      const compositionPayload = await get(configPayloadAtom);
      if (compositionPayload) {
        // TODO: create a focus-/selectAtom under cell-composition state to directly contain configuration
        const config = Object.values(compositionPayload)[0].configuration;
        // This is a safeguard to discard and eventually overwrite configurations of older format.
        if (config.unitCode) {
          return {
            version: config.version,
            unitCode: config.unitCode,
            hasPart: config.overrides,
          } as unknown as OriginalComposition;
          // TODO: add composition converter: internal representation <-> KG format, remove type casting
        }
      }
    } catch (e) {
      return getCompositionData(session.accessToken);
    }
  }

  return getCompositionData(session.accessToken);
});

const setUpdatedCompositionAtom = atom<null, [OriginalComposition], Promise<void>>(
  null,
  async (get, set, updatedComposition) => {
    const initialComposition = await get(initialCompositionAtom);

    if (!initialComposition) return;

    set(updatedCompositionWeakMapAtom, new WeakMap().set(initialComposition, updatedComposition));
  }
);

export const compositionAtom = atom<Promise<OriginalComposition | null>>(async (get) => {
  const initialComposition = await get(initialCompositionAtom);

  if (!initialComposition) return null;

  const updatedComposition = get(updatedCompositionWeakMapAtom).get(initialComposition);

  return updatedComposition ?? initialComposition;
});

export const analysedCompositionAtom = atom<Promise<AnalysedComposition | null>>(async (get) => {
  const session = get(sessionAtom);
  const selectedBrainRegion = {
    id: 'http://api.brain-map.org/api/v2/data/Structure/343',
    title: 'Brain stem',
    leaves: [
      'http://api.brain-map.org/api/v2/data/Structure/725',
      'http://api.brain-map.org/api/v2/data/Structure/321',
      'http://api.brain-map.org/api/v2/data/Structure/552',
      'http://api.brain-map.org/api/v2/data/Structure/851',
      'http://api.brain-map.org/api/v2/data/Structure/629',
      'http://api.brain-map.org/api/v2/data/Structure/589508451',
      'http://api.brain-map.org/api/v2/data/Structure/483',
      'http://api.brain-map.org/api/v2/data/Structure/606826647',
      'http://api.brain-map.org/api/v2/data/Structure/12',
      'http://api.brain-map.org/api/v2/data/Structure/143',
      'http://api.brain-map.org/api/v2/data/Structure/834',
      'http://api.brain-map.org/api/v2/data/Structure/785',
      'http://api.brain-map.org/api/v2/data/Structure/599626927',
      'http://api.brain-map.org/api/v2/data/Structure/2723065947',
      'http://api.brain-map.org/api/v2/data/Structure/617',
      'http://api.brain-map.org/api/v2/data/Structure/2254557934',
      'http://api.brain-map.org/api/v2/data/Structure/3654510924',
      'http://api.brain-map.org/api/v2/data/Structure/2127067043',
      'http://api.brain-map.org/api/v2/data/Structure/574',
      'http://api.brain-map.org/api/v2/data/Structure/804',
      'http://api.brain-map.org/api/v2/data/Structure/607344838',
      'http://api.brain-map.org/api/v2/data/Structure/422',
      'http://api.brain-map.org/api/v2/data/Structure/42',
      'http://api.brain-map.org/api/v2/data/Structure/173',
      'http://api.brain-map.org/api/v2/data/Structure/59',
      'http://api.brain-map.org/api/v2/data/Structure/217',
      'http://api.brain-map.org/api/v2/data/Structure/576073704',
      'http://api.brain-map.org/api/v2/data/Structure/887',
      'http://api.brain-map.org/api/v2/data/Structure/811',
      'http://api.brain-map.org/api/v2/data/Structure/955',
      'http://api.brain-map.org/api/v2/data/Structure/607344830',
      'http://api.brain-map.org/api/v2/data/Structure/15',
      'http://api.brain-map.org/api/v2/data/Structure/661',
      'http://api.brain-map.org/api/v2/data/Structure/606826663',
      'http://api.brain-map.org/api/v2/data/Structure/2183090366',
      'http://api.brain-map.org/api/v2/data/Structure/3009745967',
      'http://api.brain-map.org/api/v2/data/Structure/756',
      'http://api.brain-map.org/api/v2/data/Structure/262',
      'http://api.brain-map.org/api/v2/data/Structure/599626923',
      'http://api.brain-map.org/api/v2/data/Structure/3467149620',
      'http://api.brain-map.org/api/v2/data/Structure/35',
      'http://api.brain-map.org/api/v2/data/Structure/548',
      'http://api.brain-map.org/api/v2/data/Structure/1043765183',
      'http://api.brain-map.org/api/v2/data/Structure/106',
      'http://api.brain-map.org/api/v2/data/Structure/197',
      'http://api.brain-map.org/api/v2/data/Structure/66',
      'http://api.brain-map.org/api/v2/data/Structure/214',
      'http://api.brain-map.org/api/v2/data/Structure/185',
      'http://api.brain-map.org/api/v2/data/Structure/923',
      'http://api.brain-map.org/api/v2/data/Structure/255',
      'http://api.brain-map.org/api/v2/data/Structure/1052',
      'http://api.brain-map.org/api/v2/data/Structure/193',
      'http://api.brain-map.org/api/v2/data/Structure/53',
      'http://api.brain-map.org/api/v2/data/Structure/653',
      'http://api.brain-map.org/api/v2/data/Structure/3449035628',
      'http://api.brain-map.org/api/v2/data/Structure/1140764290',
      'http://api.brain-map.org/api/v2/data/Structure/1077',
      'http://api.brain-map.org/api/v2/data/Structure/126',
      'http://api.brain-map.org/api/v2/data/Structure/2316153360',
      'http://api.brain-map.org/api/v2/data/Structure/980',
      'http://api.brain-map.org/api/v2/data/Structure/2614168502',
      'http://api.brain-map.org/api/v2/data/Structure/607344842',
      'http://api.brain-map.org/api/v2/data/Structure/1072',
      'http://api.brain-map.org/api/v2/data/Structure/432',
      'http://api.brain-map.org/api/v2/data/Structure/2869757686',
      'http://api.brain-map.org/api/v2/data/Structure/757',
      'http://api.brain-map.org/api/v2/data/Structure/560581555',
      'http://api.brain-map.org/api/v2/data/Structure/1',
      'http://api.brain-map.org/api/v2/data/Structure/640',
      'http://api.brain-map.org/api/v2/data/Structure/839',
      'http://api.brain-map.org/api/v2/data/Structure/666',
      'http://api.brain-map.org/api/v2/data/Structure/300',
      'http://api.brain-map.org/api/v2/data/Structure/915',
      'http://api.brain-map.org/api/v2/data/Structure/607344834',
      'http://api.brain-map.org/api/v2/data/Structure/177',
      'http://api.brain-map.org/api/v2/data/Structure/137',
      'http://api.brain-map.org/api/v2/data/Structure/733',
      'http://api.brain-map.org/api/v2/data/Structure/621',
      'http://api.brain-map.org/api/v2/data/Structure/607344858',
      'http://api.brain-map.org/api/v2/data/Structure/2114704803',
      'http://api.brain-map.org/api/v2/data/Structure/1093',
      'http://api.brain-map.org/api/v2/data/Structure/460',
      'http://api.brain-map.org/api/v2/data/Structure/531',
      'http://api.brain-map.org/api/v2/data/Structure/169',
      'http://api.brain-map.org/api/v2/data/Structure/575',
      'http://api.brain-map.org/api/v2/data/Structure/186',
      'http://api.brain-map.org/api/v2/data/Structure/83',
      'http://api.brain-map.org/api/v2/data/Structure/283',
      'http://api.brain-map.org/api/v2/data/Structure/87',
      'http://api.brain-map.org/api/v2/data/Structure/356',
      'http://api.brain-map.org/api/v2/data/Structure/626',
      'http://api.brain-map.org/api/v2/data/Structure/978',
      'http://api.brain-map.org/api/v2/data/Structure/606826655',
      'http://api.brain-map.org/api/v2/data/Structure/765',
      'http://api.brain-map.org/api/v2/data/Structure/555',
      'http://api.brain-map.org/api/v2/data/Structure/76',
      'http://api.brain-map.org/api/v2/data/Structure/676',
      'http://api.brain-map.org/api/v2/data/Structure/372',
      'http://api.brain-map.org/api/v2/data/Structure/874',
      'http://api.brain-map.org/api/v2/data/Structure/429',
      'http://api.brain-map.org/api/v2/data/Structure/748',
      'http://api.brain-map.org/api/v2/data/Structure/462',
      'http://api.brain-map.org/api/v2/data/Structure/1040222935',
      'http://api.brain-map.org/api/v2/data/Structure/147',
      'http://api.brain-map.org/api/v2/data/Structure/875',
      'http://api.brain-map.org/api/v2/data/Structure/439',
      'http://api.brain-map.org/api/v2/data/Structure/685',
      'http://api.brain-map.org/api/v2/data/Structure/464',
      'http://api.brain-map.org/api/v2/data/Structure/72',
      'http://api.brain-map.org/api/v2/data/Structure/549009219',
      'http://api.brain-map.org/api/v2/data/Structure/1463730273',
      'http://api.brain-map.org/api/v2/data/Structure/1113',
      'http://api.brain-map.org/api/v2/data/Structure/494',
      'http://api.brain-map.org/api/v2/data/Structure/549009227',
      'http://api.brain-map.org/api/v2/data/Structure/206',
      'http://api.brain-map.org/api/v2/data/Structure/953',
      'http://api.brain-map.org/api/v2/data/Structure/970',
      'http://api.brain-map.org/api/v2/data/Structure/222',
      'http://api.brain-map.org/api/v2/data/Structure/568',
      'http://api.brain-map.org/api/v2/data/Structure/607344854',
      'http://api.brain-map.org/api/v2/data/Structure/931',
      'http://api.brain-map.org/api/v2/data/Structure/1124',
      'http://api.brain-map.org/api/v2/data/Structure/101',
      'http://api.brain-map.org/api/v2/data/Structure/146',
      'http://api.brain-map.org/api/v2/data/Structure/560581551',
      'http://api.brain-map.org/api/v2/data/Structure/503',
      'http://api.brain-map.org/api/v2/data/Structure/777',
      'http://api.brain-map.org/api/v2/data/Structure/606826651',
      'http://api.brain-map.org/api/v2/data/Structure/674',
      'http://api.brain-map.org/api/v2/data/Structure/17',
      'http://api.brain-map.org/api/v2/data/Structure/868',
      'http://api.brain-map.org/api/v2/data/Structure/80',
      'http://api.brain-map.org/api/v2/data/Structure/682',
      'http://api.brain-map.org/api/v2/data/Structure/194',
      'http://api.brain-map.org/api/v2/data/Structure/189',
      'http://api.brain-map.org/api/v2/data/Structure/716',
      'http://api.brain-map.org/api/v2/data/Structure/286',
      'http://api.brain-map.org/api/v2/data/Structure/280',
      'http://api.brain-map.org/api/v2/data/Structure/842',
      'http://api.brain-map.org/api/v2/data/Structure/358',
      'http://api.brain-map.org/api/v2/data/Structure/1120',
      'http://api.brain-map.org/api/v2/data/Structure/115',
      'http://api.brain-map.org/api/v2/data/Structure/523',
      'http://api.brain-map.org/api/v2/data/Structure/549009223',
      'http://api.brain-map.org/api/v2/data/Structure/724',
      'http://api.brain-map.org/api/v2/data/Structure/636',
      'http://api.brain-map.org/api/v2/data/Structure/607344846',
      'http://api.brain-map.org/api/v2/data/Structure/3101970431',
      'http://api.brain-map.org/api/v2/data/Structure/706',
      'http://api.brain-map.org/api/v2/data/Structure/447',
      'http://api.brain-map.org/api/v2/data/Structure/796',
      'http://api.brain-map.org/api/v2/data/Structure/1557651847',
      'http://api.brain-map.org/api/v2/data/Structure/110',
      'http://api.brain-map.org/api/v2/data/Structure/67',
      'http://api.brain-map.org/api/v2/data/Structure/914',
      'http://api.brain-map.org/api/v2/data/Structure/560',
      'http://api.brain-map.org/api/v2/data/Structure/587',
      'http://api.brain-map.org/api/v2/data/Structure/209',
      'http://api.brain-map.org/api/v2/data/Structure/7',
      'http://api.brain-map.org/api/v2/data/Structure/763',
      'http://api.brain-map.org/api/v2/data/Structure/769',
      'http://api.brain-map.org/api/v2/data/Structure/891',
      'http://api.brain-map.org/api/v2/data/Structure/616',
      'http://api.brain-map.org/api/v2/data/Structure/118',
      'http://api.brain-map.org/api/v2/data/Structure/82',
      'http://api.brain-map.org/api/v2/data/Structure/761',
      'http://api.brain-map.org/api/v2/data/Structure/272',
      'http://api.brain-map.org/api/v2/data/Structure/226',
      'http://api.brain-map.org/api/v2/data/Structure/684',
      'http://api.brain-map.org/api/v2/data/Structure/374',
      'http://api.brain-map.org/api/v2/data/Structure/1593308392',
      'http://api.brain-map.org/api/v2/data/Structure/207',
      'http://api.brain-map.org/api/v2/data/Structure/61',
      'http://api.brain-map.org/api/v2/data/Structure/549009215',
      'http://api.brain-map.org/api/v2/data/Structure/511',
      'http://api.brain-map.org/api/v2/data/Structure/963',
      'http://api.brain-map.org/api/v2/data/Structure/496345664',
      'http://api.brain-map.org/api/v2/data/Structure/381',
      'http://api.brain-map.org/api/v2/data/Structure/470',
      'http://api.brain-map.org/api/v2/data/Structure/58',
      'http://api.brain-map.org/api/v2/data/Structure/149',
      'http://api.brain-map.org/api/v2/data/Structure/708',
      'http://api.brain-map.org/api/v2/data/Structure/203',
      'http://api.brain-map.org/api/v2/data/Structure/741',
      'http://api.brain-map.org/api/v2/data/Structure/307',
      'http://api.brain-map.org/api/v2/data/Structure/642',
      'http://api.brain-map.org/api/v2/data/Structure/939',
      'http://api.brain-map.org/api/v2/data/Structure/749',
      'http://api.brain-map.org/api/v2/data/Structure/549009207',
      'http://api.brain-map.org/api/v2/data/Structure/162',
      'http://api.brain-map.org/api/v2/data/Structure/1088',
      'http://api.brain-map.org/api/v2/data/Structure/740',
      'http://api.brain-map.org/api/v2/data/Structure/218',
      'http://api.brain-map.org/api/v2/data/Structure/1048',
      'http://api.brain-map.org/api/v2/data/Structure/26',
      'http://api.brain-map.org/api/v2/data/Structure/350',
      'http://api.brain-map.org/api/v2/data/Structure/549009211',
      'http://api.brain-map.org/api/v2/data/Structure/437',
      'http://api.brain-map.org/api/v2/data/Structure/45',
      'http://api.brain-map.org/api/v2/data/Structure/77',
      'http://api.brain-map.org/api/v2/data/Structure/852',
      'http://api.brain-map.org/api/v2/data/Structure/907',
      'http://api.brain-map.org/api/v2/data/Structure/2557684018',
      'http://api.brain-map.org/api/v2/data/Structure/946',
      'http://api.brain-map.org/api/v2/data/Structure/114',
      'http://api.brain-map.org/api/v2/data/Structure/872',
      'http://api.brain-map.org/api/v2/data/Structure/79',
      'http://api.brain-map.org/api/v2/data/Structure/975',
      'http://api.brain-map.org/api/v2/data/Structure/607344850',
      'http://api.brain-map.org/api/v2/data/Structure/599',
      'http://api.brain-map.org/api/v2/data/Structure/789',
      'http://api.brain-map.org/api/v2/data/Structure/615',
      'http://api.brain-map.org/api/v2/data/Structure/883',
      'http://api.brain-map.org/api/v2/data/Structure/1690235425',
      'http://api.brain-map.org/api/v2/data/Structure/1126',
      'http://api.brain-map.org/api/v2/data/Structure/1110',
      'http://api.brain-map.org/api/v2/data/Structure/711',
      'http://api.brain-map.org/api/v2/data/Structure/732',
      'http://api.brain-map.org/api/v2/data/Structure/3409505442',
      'http://api.brain-map.org/api/v2/data/Structure/659',
      'http://api.brain-map.org/api/v2/data/Structure/609',
      'http://api.brain-map.org/api/v2/data/Structure/534',
      'http://api.brain-map.org/api/v2/data/Structure/549009203',
      'http://api.brain-map.org/api/v2/data/Structure/898',
      'http://api.brain-map.org/api/v2/data/Structure/1107',
      'http://api.brain-map.org/api/v2/data/Structure/230',
      'http://api.brain-map.org/api/v2/data/Structure/215',
      'http://api.brain-map.org/api/v2/data/Structure/271',
      'http://api.brain-map.org/api/v2/data/Structure/591',
      'http://api.brain-map.org/api/v2/data/Structure/880',
      'http://api.brain-map.org/api/v2/data/Structure/614454277',
      'http://api.brain-map.org/api/v2/data/Structure/99',
      'http://api.brain-map.org/api/v2/data/Structure/652',
      'http://api.brain-map.org/api/v2/data/Structure/69',
      'http://api.brain-map.org/api/v2/data/Structure/96',
      'http://api.brain-map.org/api/v2/data/Structure/1020',
      'http://api.brain-map.org/api/v2/data/Structure/820',
      'http://api.brain-map.org/api/v2/data/Structure/691',
      'http://api.brain-map.org/api/v2/data/Structure/860',
      'http://api.brain-map.org/api/v2/data/Structure/560581559',
      'http://api.brain-map.org/api/v2/data/Structure/576073699',
      'http://api.brain-map.org/api/v2/data/Structure/347',
      'http://api.brain-map.org/api/v2/data/Structure/27',
      'http://api.brain-map.org/api/v2/data/Structure/2218808594',
      'http://api.brain-map.org/api/v2/data/Structure/181',
      'http://api.brain-map.org/api/v2/data/Structure/136',
      'http://api.brain-map.org/api/v2/data/Structure/30',
      'http://api.brain-map.org/api/v2/data/Structure/628',
      'http://api.brain-map.org/api/v2/data/Structure/455',
      'http://api.brain-map.org/api/v2/data/Structure/563807439',
      'http://api.brain-map.org/api/v2/data/Structure/1004',
      'http://api.brain-map.org/api/v2/data/Structure/580',
      'http://api.brain-map.org/api/v2/data/Structure/123',
      'http://api.brain-map.org/api/v2/data/Structure/225',
      'http://api.brain-map.org/api/v2/data/Structure/105',
      'http://api.brain-map.org/api/v2/data/Structure/64',
      'http://api.brain-map.org/api/v2/data/Structure/2956165934',
      'http://api.brain-map.org/api/v2/data/Structure/828',
      'http://api.brain-map.org/api/v2/data/Structure/1096',
      'http://api.brain-map.org/api/v2/data/Structure/899',
      'http://api.brain-map.org/api/v2/data/Structure/223',
      'http://api.brain-map.org/api/v2/data/Structure/576',
      'http://api.brain-map.org/api/v2/data/Structure/1104',
      'http://api.brain-map.org/api/v2/data/Structure/1842735199',
      'http://api.brain-map.org/api/v2/data/Structure/390',
      'http://api.brain-map.org/api/v2/data/Structure/364',
      'http://api.brain-map.org/api/v2/data/Structure/634',
      'http://api.brain-map.org/api/v2/data/Structure/122',
      'http://api.brain-map.org/api/v2/data/Structure/75',
      'http://api.brain-map.org/api/v2/data/Structure/660',
      'http://api.brain-map.org/api/v2/data/Structure/773',
      'http://api.brain-map.org/api/v2/data/Structure/859',
      'http://api.brain-map.org/api/v2/data/Structure/50',
      'http://api.brain-map.org/api/v2/data/Structure/1029',
      'http://api.brain-map.org/api/v2/data/Structure/563807435',
      'http://api.brain-map.org/api/v2/data/Structure/1118',
      'http://api.brain-map.org/api/v2/data/Structure/47',
      'http://api.brain-map.org/api/v2/data/Structure/155',
      'http://api.brain-map.org/api/v2/data/Structure/1044',
      'http://api.brain-map.org/api/v2/data/Structure/246',
      'http://api.brain-map.org/api/v2/data/Structure/700',
      'http://api.brain-map.org/api/v2/data/Structure/133',
      'http://api.brain-map.org/api/v2/data/Structure/614',
      'http://api.brain-map.org/api/v2/data/Structure/452',
      'http://api.brain-map.org/api/v2/data/Structure/606826659',
      'http://api.brain-map.org/api/v2/data/Structure/55',
      'http://api.brain-map.org/api/v2/data/Structure/1079',
      'http://api.brain-map.org/api/v2/data/Structure/689',
      'http://api.brain-map.org/api/v2/data/Structure/560581563',
      'http://api.brain-map.org/api/v2/data/Structure/414',
      'http://api.brain-map.org/api/v2/data/Structure/668',
      'http://api.brain-map.org/api/v2/data/Structure/1039',
      'http://api.brain-map.org/api/v2/data/Structure/1171543751',
      'http://api.brain-map.org/api/v2/data/Structure/210',
      'http://api.brain-map.org/api/v2/data/Structure/718',
      'http://api.brain-map.org/api/v2/data/Structure/338',
      'http://api.brain-map.org/api/v2/data/Structure/325',
      'http://api.brain-map.org/api/v2/data/Structure/930',
      'http://api.brain-map.org/api/v2/data/Structure/366',
      'http://api.brain-map.org/api/v2/data/Structure/539',
      'http://api.brain-map.org/api/v2/data/Structure/607344862',
      'http://api.brain-map.org/api/v2/data/Structure/90',
      'http://api.brain-map.org/api/v2/data/Structure/231',
      'http://api.brain-map.org/api/v2/data/Structure/1098',
      'http://api.brain-map.org/api/v2/data/Structure/995',
      'http://api.brain-map.org/api/v2/data/Structure/1109',
      'http://api.brain-map.org/api/v2/data/Structure/238',
      'http://api.brain-map.org/api/v2/data/Structure/903',
      'http://api.brain-map.org/api/v2/data/Structure/1061',
      'http://api.brain-map.org/api/v2/data/Structure/130',
      'http://api.brain-map.org/api/v2/data/Structure/318',
      'http://api.brain-map.org/api/v2/data/Structure/10671',
      'http://api.brain-map.org/api/v2/data/Structure/496345672',
      'http://api.brain-map.org/api/v2/data/Structure/604',
      'http://api.brain-map.org/api/v2/data/Structure/496345668',
      'http://api.brain-map.org/api/v2/data/Structure/263',
      'http://api.brain-map.org/api/v2/data/Structure/161',
      'http://api.brain-map.org/api/v2/data/Structure/202',
      'http://api.brain-map.org/api/v2/data/Structure/781',
      'http://api.brain-map.org/api/v2/data/Structure/112',
      'http://api.brain-map.org/api/v2/data/Structure/316',
    ],
  };
  const compositionData = await get(compositionAtom);

  console.log('–– – index.ts:91 – analysedCompositionAtom – compositionData:', compositionData);

  const volumes = await get(brainRegionOntologyVolumesAtom);

  if (!session || !selectedBrainRegion || !compositionData || !volumes) return null;
  // TODO: the leaf IDS retrieved from BMO are incorrect. Change the implementation to calculate them here
  const leaves = selectedBrainRegion.leaves ? selectedBrainRegion.leaves : [selectedBrainRegion.id];
  return calculateCompositions(compositionData, selectedBrainRegion.id, leaves, volumes);
});

export const analysedMTypesAtom = atom<Promise<MModelMenuItem[]>>(async (get) => {
  const composition = await get(analysedCompositionAtom);
  return composition !== null
    ? filter(composition.nodes, { about: 'MType' }).map((node) => ({
        label: node.label,
        id: node.id,
      }))
    : [];
});

export const analysedETypesAtom = atom<Promise<MEModelMenuItem>>(async (get) => {
  const analysedMTypes = await get(analysedMTypesAtom);

  // transform the mType info into a map for easier access
  const mTypesMap = new Map<string, MModelMenuItem>();
  analysedMTypes.forEach((mType) => {
    mTypesMap.set(mType.id, mType);
  });

  const composition = await get(analysedCompositionAtom);
  if (!composition) return {};

  const eTypeNodes = filter(composition.nodes, { about: 'EType' });
  // group all e-types per m-type
  return eTypeNodes.reduce((acc, eType) => {
    const mTypeInfo = mTypesMap.get(eType.parentId || '');
    if (!mTypeInfo) return acc;

    const eTypeInfo: EModelMenuItem = {
      name: eType.label,
      id: eType.id,
      eType: eType.label,
      mType: mTypeInfo.label,
      isOptimizationConfig: false,
      rev: -1,
    };

    const existingMTypeInfo = acc[mTypeInfo.label];
    if (existingMTypeInfo) {
      existingMTypeInfo.eTypeInfo = [...existingMTypeInfo.eTypeInfo, eTypeInfo];
    } else {
      acc[mTypeInfo.label] = {
        mTypeInfo,
        eTypeInfo: [eTypeInfo],
      };
    }

    return acc;
  }, {} as MEModelMenuItem);
});

export const computeAndSetCompositionAtom = atom(
  null,
  async (get, set, modifiedNode: CalculatedCompositionNode, newValue: number) => {
    const analysedComposition = await get(analysedCompositionAtom);
    const volumes = await get(brainRegionOntologyVolumesAtom);
    if (!analysedComposition || modifiedNode.composition === undefined) {
      return;
    }
    const { composition } = analysedComposition;
    const densityOrCount = get(densityOrCountAtom);

    const valueDifference = newValue - modifiedNode.composition;
    const compositionHistory = get(compositionHistoryAtom);
    const historyIndex = get(compositionHistoryIndexAtom);
    const selectedBrainRegion = get(selectedBrainRegionAtom);

    if (selectedBrainRegion && volumes) {
      const modifiedComposition = computeModifiedComposition(
        modifiedNode,
        valueDifference,
        modifiedNode.leaves,
        composition,
        densityOrCount,
        volumes,
        selectedBrainRegion?.id
      );
      set(setUpdatedCompositionAtom, modifiedComposition);

      const compositionClone = cloneDeep(modifiedComposition);
      extendCompositionWithOverrideProps(compositionClone);

      set(setCompositionPayloadConfigurationAtom, compositionClone);

      // whenever there is a change, we also update the history
      const newHistory = [...compositionHistory.slice(0, historyIndex + 1), compositionClone];
      set(compositionHistoryAtom, newHistory);
      set(compositionHistoryIndexAtom, newHistory.length - 1);
    }
  }
);

export const setCompositionAtom = atom(null, (_get, set, composition: OriginalComposition) => {
  set(setUpdatedCompositionAtom, composition);
});
