'use client';

import { atom } from 'jotai';

import { cellCompositionConfigIdAtom } from '@/state/brain-model-config';
import sessionAtom from '@/state/session';
import { fetchResourceById, fetchJsonFileByUrl, fetchGeneratorTaskActivity } from '@/api/nexus';
import {
  CellCompositionConfigPayload,
  CellCompositionConfigResource,
  CellCompositionResource,
  GeneratorTaskActivityResource,
} from '@/types/nexus';

const refetchTriggerAtom = atom<{}>({});
export const triggerRefetchAtom = atom(null, (get, set) => set(refetchTriggerAtom, {}));

export const configAtom = atom<Promise<CellCompositionConfigResource | null>>(async (get) => {
  const session = get(sessionAtom);
  const id = await get(cellCompositionConfigIdAtom);

  get(refetchTriggerAtom);

  if (!session || !id) return null;

  return fetchResourceById<CellCompositionConfigResource>(id, session);
});

const configPayloadUrlAtom = atom(async (get) => {
  const config = await get(configAtom);
  return config?.distribution?.contentUrl;
});

const remoteConfigPayloadAtom = atom<Promise<CellCompositionConfigPayload | null>>(async (get) => {
  const session = get(sessionAtom);
  const configPayloadUrl = await get(configPayloadUrlAtom);

  if (!session || !configPayloadUrl) {
    return null;
  }

  const url = configPayloadUrl;

  if (!url) {
    // ? return default value
    return null;
  }

  return fetchJsonFileByUrl<CellCompositionConfigPayload>(url, session);
});

// This holds a reference to the localConfigPayload by it's remoteConfigPayload
const localConfigPayloadWeakMapAtom = atom<
  WeakMap<CellCompositionConfigPayload, CellCompositionConfigPayload>
>(new WeakMap());

export const setLocalConfigPayloadAtom = atom<null, [CellCompositionConfigPayload], Promise<void>>(
  null,
  async (get, set, configPayload) => {
    const remoteConfig = await get(remoteConfigPayloadAtom);

    if (!remoteConfig) return;

    set(localConfigPayloadWeakMapAtom, new WeakMap().set(remoteConfig, configPayload));
  }
);

export const configPayloadAtom = atom<Promise<CellCompositionConfigPayload | null>>(async (get) => {
  const remoteConfig = await get(remoteConfigPayloadAtom);

  if (!remoteConfig) return null;

  const localConfig = get(localConfigPayloadWeakMapAtom).get(remoteConfig);

  return localConfig ?? remoteConfig;
});

export const createGetVariantAtom = (entityId: string) => {
  return atom(async (get) => {
    const cellCompositionConfigPayload = await get(configPayloadAtom);
    return cellCompositionConfigPayload?.[entityId]?.variantDefinition;
  });
};

export const createGetInputsAtom = (entityId: string) => {
  return atom(async (get) => {
    const cellCompositionConfigPayload = await get(configPayloadAtom);
    return cellCompositionConfigPayload?.[entityId]?.inputs;
  });
};

export const createGetConfigurationAtom = (entityId: string) => {
  return atom(async (get) => {
    const cellCompositionConfigPayload = await get(configPayloadAtom);
    return cellCompositionConfigPayload?.[entityId]?.configuration;
  });
};

export const createGetJobConfigAtom = (entityId: string) => {
  return atom(async (get) => {
    const cellCompositionConfigPayload = await get(configPayloadAtom);
    return cellCompositionConfigPayload?.[entityId]?.jobConfiguration;
  });
};

const generatorTaskActivityAtom = atom<Promise<GeneratorTaskActivityResource | null>>(
  async (get) => {
    const session = get(sessionAtom);
    const config = await get(configAtom);

    if (!session || !config) return null;

    return fetchGeneratorTaskActivity(config['@id'], config._rev, session);
  }
);

export const cellCompositionAtom = atom<Promise<CellCompositionResource | null>>(async (get) => {
  const session = get(sessionAtom);
  const generatorTaskActivity = await get(generatorTaskActivityAtom);

  if (!session || !generatorTaskActivity) return null;

  return fetchResourceById<CellCompositionResource>(
    generatorTaskActivity.generated['@id'],
    session
  );
});
