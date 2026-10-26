import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, waitFor } from '@testing-library/react';
import { Provider as JotaiProvider } from 'jotai';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IonChannelModelPropertiesChecks } from '@/features/scan-config/components/ui-elements/ion-channel-model-properties';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';

import type { Config, ConfigSchema } from '@/features/scan-config/types';

const notification = vi.hoisted(() => ({ info: vi.fn() }));
const temperatures = vi.hoisted(() => ({ byId: {} as Record<string, number | null> }));

vi.mock('@/components/notification', () => ({ useAppNotification: () => notification }));
vi.mock('@/ui/hooks/use-workspace', () => ({
  useWorkspace: () => ({ virtualLabId: 'lab', projectId: 'project' }),
}));
vi.mock('@/api/entitycore/queries/experimental/ion-channel-recording', () => ({
  getIonChannelRecording: ({ id }: { id: string }) =>
    Promise.resolve({
      id,
      name: id,
      temperature: temperatures.byId[id],
      ion_channel: { name: 'Kv1' },
      subject: { species: { id: 'mouse' }, strain: null },
      brain_region: { id: 'region', hierarchy_id: 'hierarchy' },
    }),
}));
vi.mock('@/api/entitycore/queries/general/brain-region', () => ({
  getBrainRegionHierarchiesWithSpecies: () => Promise.resolve({ data: [] }),
  getBrainRegionHierarchy: () => new Promise(() => {}),
}));

const SCHEMA = {
  properties: {
    initialize: {
      properties: {
        model_properties: { ui_element: ScanConfigUIElementDict.IonChannelModelProperties },
      },
    },
  },
} as unknown as ConfigSchema;

function Harness({ locked, onConfig }: { locked: boolean; onConfig: (config: Config) => void }) {
  const [config, setConfig] = useState<Config>({
    initialize: {
      recordings: Object.keys(temperatures.byId).map((id) => ({ id_str: id })),
      model_properties: {},
    },
  } as unknown as Config);
  onConfig(config);
  return (
    <IonChannelModelPropertiesChecks
      schema={SCHEMA}
      config={config}
      setConfig={setConfig}
      locked={locked}
    />
  );
}

function renderChecks({ locked = false } = {}) {
  const configs: Config[] = [];
  render(
    <QueryClientProvider client={new QueryClient()}>
      <JotaiProvider>
        <Harness locked={locked} onConfig={(config) => configs.push(config)} />
      </JotaiProvider>
    </QueryClientProvider>
  );
  return () => configs.at(-1) as { initialize: { model_properties: { temperature?: number } } };
}

describe('ion channel model temperature preselection toast', () => {
  beforeEach(() => {
    notification.info.mockClear();
  });

  it('preselects the first recording temperature and toasts once when they differ', async () => {
    temperatures.byId = { r1: 23, r2: 30 };
    const latestConfig = renderChecks();

    await waitFor(() => expect(latestConfig().initialize.model_properties.temperature).toBe(23));
    expect(notification.info).toHaveBeenCalledTimes(1);
    expect(notification.info).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'ion-channel-temperatures-differ',
        description: expect.stringContaining("The first recording's 23 °C is preselected"),
      })
    );
  });

  it('stays quiet when the recordings share a temperature', async () => {
    temperatures.byId = { r1: 23, r2: 23 };
    const latestConfig = renderChecks();

    await waitFor(() => expect(latestConfig()).toBeDefined());
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(notification.info).not.toHaveBeenCalled();
  });

  it('stays quiet when the config is locked', async () => {
    temperatures.byId = { r1: 23, r2: 30 };
    const latestConfig = renderChecks({ locked: true });

    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(latestConfig().initialize.model_properties.temperature).toBeUndefined();
    expect(notification.info).not.toHaveBeenCalled();
  });
});
