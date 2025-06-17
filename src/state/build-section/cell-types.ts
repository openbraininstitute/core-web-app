import { atom } from 'jotai';
import esb from 'elastic-builder';
import toLower from 'lodash/toLower';
import findKey from 'lodash/findKey';

import sessionAtom from '@/state/session';
import { createHeaders } from '@/util/utils';
import { ClassNexus } from '@/api/ontologies/types';
import { ATLAS_SEARCH_URL } from '@/constants/build-section';
import { ETYPE_NEXUS_TYPE, MTYPE_NEXUS_TYPE } from '@/constants/ontologies';

type ClassESResponse = {
  _source: ClassNexus;
};

// Returns cell types metadata
export const cellTypesAtom = atom<Promise<any> | null>(async (get) => {
  const session = get(sessionAtom);
  if (!session) return null;

  const query = esb
    .requestBodySearch()
    .query(
      esb
        .boolQuery()
        .must(esb.termQuery('@type', 'Class'))
        .must(esb.termQuery('_deprecated', false))
        .must(esb.termsQuery('subClassOf', [MTYPE_NEXUS_TYPE, ETYPE_NEXUS_TYPE]))
    )
    .size(10000);

  return fetch(ATLAS_SEARCH_URL, {
    method: 'POST',
    headers: createHeaders(session.accessToken),
    body: JSON.stringify(query.toJSON()),
  }).then((res) => res.json());
});

// Returns cell types metadata in key => value format where key = id of cell type
export const cellTypesByIdAtom = atom(async (get) => {
  const cellTypes = await get(cellTypesAtom);
  if (!cellTypes || !cellTypes.hits) return null;
  return cellTypes.hits.hits.reduce(
    (acc: Record<string, ClassNexus>, classObj: ClassESResponse) => {
      acc[classObj._source['@id']] = classObj._source;
      return acc;
    },
    {}
  );
});

// Returns cell types metadata in key => value format where key = label of cell type
export const cellTypesByLabelAtom = atom(async (get) => {
  const cellTypes = await get(cellTypesAtom);
  if (!cellTypes || !cellTypes.hits) return null;

  return cellTypes.hits.hits.reduce(
    (acc: Record<string, ClassNexus>, classObj: ClassESResponse) => {
      acc[classObj._source.label] = classObj._source;
      // TODO: this is temporary until a fix applied to nexus/entitycore
      const matchedKey = findKey(
        TEMPORARY_TYPE_DEFINITION,
        (_, k) => toLower(k) === toLower(classObj._source.label)
      );
      const matchedValue = (
        matchedKey ? (TEMPORARY_TYPE_DEFINITION as any)[matchedKey] : classObj._source?.definition
      ) as string | undefined;

      acc[classObj._source.label] = {
        ...classObj._source,
        definition: matchedValue,
      };
      return acc;
    },
    {}
  );
});

// TODO: this should be fixed in nexus/entitycore level
const TEMPORARY_TYPE_DEFINITION = {
  cNAC: 'Continuous non-accommodating electrical type',
  cADpyr: 'Continuous adapting pyramidal cell electrical type',
  cACpyr: 'Continuous accommodating pyramidal cell electrical type',
  bAC: 'Burst accommodating electrical type',
  cAC: 'Continuous accommodating electrical type',
  cNAD_lts_dSTR:
    "Low-threshold spiking, tonically active, slow and regular firing, characteristic 'notch' in the membrane potential during the depolarizing phase of the action potential, depolarizing sag, high input resistance",
  dAD_htp_dSTR:
    'delayed spike, adapting or accelerating, input rectification, irregular spiking, high-threshold spike, pacemaker-like firing',
  dAD_ltb_dSTR:
    'Delayed spike, adapting or accelerating, input rectification, low resting potential, regular spiking, low-threshold spike, burst firing',
  bSTUT: 'Burst stuttering electrical type',
  dNAC: 'Delayed non-accommodating electrical type',
  GEN_etype: 'Generic excitatory neuron electrical type',
  GIN_etype: 'Generic inhibitory neuron electrical type',
  bIR: 'Burst irregular electrical type',
  bNAC: 'Burst non-accommodating electrical type',
  cAD_noscltb: 'Continuous adapting non-oscillatory low-threshold bursting electrical type',
  cIR: 'Continuous irregular electrical type',
  cNAD_ltb_dSTR:
    "Low-threshold spiking, tonically active, slow and regular firing, characteristic 'notch' in the membrane potential during the depolarizing phase of the action potential, depolarizing sag, high input resistance",
  cNAD_noscltb: 'Continuous non-adapting non-oscillatory low-threshold bursting electrical type',
  cSTUT: 'Continuous stuttering electrical type',
  dAD_ltb: 'Delayed adapting low-threshold bursting electrical type',
  dNAD_ltb: 'Delayed non-adapting low-threshold bursting electrical type',
  dSTUT: 'Delayed stuttering electrical type',
  bIR_dSTR: 'Tonically active neurons, irregular spiking, burst firing electrical type',
};
