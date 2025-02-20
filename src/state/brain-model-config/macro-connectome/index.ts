'use client';

import { atom } from 'jotai';
import { loadable } from 'jotai/utils';
import { tableFromIPC, Table } from '@apache-arrow/es2015-esm';

import { macroConnectomeConfigIdAtom } from '..';
import { brainRegionLeaveIdxByNotationMapAtom } from '@/state/brain-regions';
import sessionAtom from '@/state/session';
import {
  DetailedCircuitResource,
  GeneratorTaskActivityResource,
  MacroConnectomeConfigPayload,
  MacroConnectomeConfigResource,
  BrainConnectomeStrengthResource,
} from '@/types/nexus';
import {
  fetchResourceById,
  fetchFileByUrl,
  fetchJsonFileByUrl,
  fetchGeneratorTaskActivity,
} from '@/api/nexus';
import {
  HemisphereDirection,
  MacroConnectomeEditEntry,
  WholeBrainConnectivityMatrix,
} from '@/types/connectome';
import { getFlatArrayValueIdx } from '@/util/connectome';

export const refetchCounterAtom = atom<number>(0);

export const configAtom = atom<Promise<MacroConnectomeConfigResource | null>>(async (get) => {
  const session = get(sessionAtom);
  const id = await get(macroConnectomeConfigIdAtom);

  get(refetchCounterAtom);

  if (!session || !id) return null;

  return fetchResourceById<MacroConnectomeConfigResource>(id, session);
});

export const configPayloadUrlAtom = atom<Promise<string | null>>(async (get) => {
  const config = await get(configAtom);
  if (!config) return null;

  return config.distribution.contentUrl;
});

export const remoteConfigPayloadAtom = atom<Promise<MacroConnectomeConfigPayload | null>>(
  async (get) => {
    const session = get(sessionAtom);
    const configPayloadUrl = await get(configPayloadUrlAtom);

    if (!session || !configPayloadUrl) {
      return null;
    }

    return fetchJsonFileByUrl<MacroConnectomeConfigPayload>(configPayloadUrl, session);
  }
);

export const localConfigPayloadAtom = atom<
  WeakMap<MacroConnectomeConfigPayload, MacroConnectomeConfigPayload>
>(new WeakMap());

export const configPayloadAtom = atom<Promise<MacroConnectomeConfigPayload | null>>(async (get) => {
  const remoteConfigPayload = await get(remoteConfigPayloadAtom);

  if (!remoteConfigPayload) return null;

  const localConfigPayload = get(localConfigPayloadAtom).get(remoteConfigPayload);

  return localConfigPayload ?? remoteConfigPayload;
});

export const initialConnectivityStrengthEntityAtom = atom<
  Promise<BrainConnectomeStrengthResource | null>
>(async (get) => {
  const session = get(sessionAtom);
  const remoteConfigPayload = await get(remoteConfigPayloadAtom);

  if (!session || !remoteConfigPayload) return null;

  const { id, rev } = remoteConfigPayload.initial.connection_strength;

  return fetchResourceById(id, session, { rev });
});

export const initialConnectivityStrengthTableAtom = atom<Promise<Table | null>>(async (get) => {
  const session = get(sessionAtom);
  const initialConnectivityStrengthEntity = await get(initialConnectivityStrengthEntityAtom);

  if (!session || !initialConnectivityStrengthEntity) return null;

  return tableFromIPC(
    fetchFileByUrl(initialConnectivityStrengthEntity.distribution.contentUrl, session)
  );
});

export const connectivityStrengthOverridesEntityAtom = atom<
  Promise<BrainConnectomeStrengthResource | null>
>(async (get) => {
  const session = get(sessionAtom);
  const configPayload = await get(remoteConfigPayloadAtom);

  if (!session || !configPayload) return null;

  const { id, rev } = configPayload.overrides.connection_strength;

  return fetchResourceById(id, session, { rev });
});

export const connectivityStrengthOverridesEntityRevAtom = atom<Promise<number | null>>(
  async (get) => {
    const session = get(sessionAtom);
    const connectivityStrengthOverridesEntity = await get(connectivityStrengthOverridesEntityAtom);

    get(refetchCounterAtom);

    if (!session || !connectivityStrengthOverridesEntity) return null;

    const metadata = await fetchResourceById<BrainConnectomeStrengthResource>(
      connectivityStrengthOverridesEntity['@id'],
      session
    );

    return metadata._rev;
  }
);

export const connectivityStrengthOverridesEntitySourceAtom = atom<
  Promise<BrainConnectomeStrengthResource | null>
>(async (get) => {
  const session = get(sessionAtom);
  const configPayload = await get(remoteConfigPayloadAtom);

  if (!session || !configPayload) return null;

  const { id, rev } = configPayload.overrides.connection_strength;

  return fetchResourceById(id, session, { rev });
});

export const connectivityStrengthOverridesPayloadUrlAtom = atom<Promise<string | null>>(
  async (get) => {
    const entity = await get(connectivityStrengthOverridesEntityAtom);
    if (!entity) return null;

    return entity.distribution.contentUrl;
  }
);

const connectivityStrengthOverridesTableAtom = atom<Promise<Table | null>>(async (get) => {
  const session = get(sessionAtom);
  const connectivityStrengthOverridesEntity = await get(connectivityStrengthOverridesEntityAtom);

  if (!session || !connectivityStrengthOverridesEntity) return null;

  return tableFromIPC(
    fetchFileByUrl(connectivityStrengthOverridesEntity?.distribution.contentUrl, session)
  );
});

export const initialConnectivityStrengthMatrixAtom = atom<
  Promise<WholeBrainConnectivityMatrix | null>
>(async (get) => {
  const brainRegionLeaveIdxByNotationMap = await get(brainRegionLeaveIdxByNotationMapAtom);
  const initialConnectivityStrengthTable = await get(initialConnectivityStrengthTableAtom);
  const connectivityStrengthOverridesTable = await get(connectivityStrengthOverridesTableAtom);

  if (
    !brainRegionLeaveIdxByNotationMap ||
    !initialConnectivityStrengthTable ||
    !connectivityStrengthOverridesTable
  )
    return null;

  const totalLeaves = brainRegionLeaveIdxByNotationMap.size;
  const flatArraySize = totalLeaves * totalLeaves;

  const matrix = {
    LL: new Float64Array(flatArraySize),
    LR: new Float64Array(flatArraySize),
    RL: new Float64Array(flatArraySize),
    RR: new Float64Array(flatArraySize),
  };

  initialConnectivityStrengthTable.toArray().forEach((record) => {
    const srcIdx = brainRegionLeaveIdxByNotationMap.get(record.source_region) as number;
    const dstIdx = brainRegionLeaveIdxByNotationMap.get(record.target_region) as number;

    const idx = getFlatArrayValueIdx(totalLeaves, srcIdx, dstIdx);

    matrix[record.side as HemisphereDirection][idx] = record.value;
  });

  return matrix;
});

export const remoteConnectivityStrengthMatrixAtom = atom<
  Promise<WholeBrainConnectivityMatrix | null>
>(async (get) => {
  const brainRegionLeaveIdxByNotationMap = await get(brainRegionLeaveIdxByNotationMapAtom);
  const initialConnectivityStrengthTable = await get(initialConnectivityStrengthTableAtom);
  const connectivityStrengthOverridesTable = await get(connectivityStrengthOverridesTableAtom);

  const initialMatrix = await get(initialConnectivityStrengthMatrixAtom);

  if (
    !initialMatrix ||
    !brainRegionLeaveIdxByNotationMap ||
    !initialConnectivityStrengthTable ||
    !connectivityStrengthOverridesTable
  )
    return null;

  const totalLeaves = brainRegionLeaveIdxByNotationMap.size;

  const matrix = structuredClone(initialMatrix);

  connectivityStrengthOverridesTable.toArray().forEach((record) => {
    const srcIdx = brainRegionLeaveIdxByNotationMap.get(record.source_region) as number;
    const dstIdx = brainRegionLeaveIdxByNotationMap.get(record.target_region) as number;

    const idx = getFlatArrayValueIdx(totalLeaves, srcIdx, dstIdx);

    matrix[record.side as HemisphereDirection][idx] = record.value;
  });

  return matrix;
});

export const localConnectivityStrengthMatrixAtom = atom<
  WeakMap<WholeBrainConnectivityMatrix, WholeBrainConnectivityMatrix>
>(new WeakMap());

export const connectivityStrengthMatrixAtom = atom<Promise<WholeBrainConnectivityMatrix | null>>(
  async (get) => {
    const remoteMatrix = await get(remoteConnectivityStrengthMatrixAtom);

    if (!remoteMatrix) return null;

    const localMatrix = get(localConnectivityStrengthMatrixAtom).get(remoteMatrix);

    return localMatrix ?? remoteMatrix;
  }
);

export const connectivityStrengthMatrixLoadableAtom = loadable(connectivityStrengthMatrixAtom);

export const editsAtom = atom<Promise<MacroConnectomeEditEntry[]>>(async (get) => {
  const configPayload = await get(configPayloadAtom);
  return configPayload?._ui_data?.editHistory ?? [];
});

export const editsLoadableAtom = loadable(editsAtom);

const generatorTaskActivityAtom = atom<Promise<GeneratorTaskActivityResource | null>>(
  async (get) => {
    const session = get(sessionAtom);
    const config = await get(configAtom);

    if (!session || !config) return null;

    return fetchGeneratorTaskActivity(config['@id'], config._rev, session);
  }
);

export const partialCircuitAtom = atom<Promise<DetailedCircuitResource | null>>(async (get) => {
  const session = get(sessionAtom);
  const generatorTaskActivity = await get(generatorTaskActivityAtom);

  if (!session || !generatorTaskActivity) return null;

  return fetchResourceById<DetailedCircuitResource>(
    generatorTaskActivity.generated['@id'],
    session
  );
});
