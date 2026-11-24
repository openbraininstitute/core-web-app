import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createScanConfigStore } from '@/features/scan-config/store';
import {
  ScanConfigStoreProvider,
  useConfigValue,
  useSetConfig,
} from '@/features/scan-config/use-config-store';

import type { Config } from '@/features/scan-config/types';

const renders = { name: 0, sets: 0 };

function CampaignName() {
  renders.name += 1;
  const info = useConfigValue((config) => config.info);
  return <output data-testid="name">{JSON.stringify(info)}</output>;
}

function NeuronSets() {
  renders.sets += 1;
  const sets = useConfigValue((config) => config.neuron_sets);
  const setConfig = useSetConfig();
  return (
    <button
      type="button"
      data-testid="add-set"
      onClick={() =>
        setConfig((previous) => ({
          ...previous,
          neuron_sets: { ...(previous.neuron_sets as object), Added: {} },
        }))
      }
    >
      {Object.keys(sets as object).join(',')}
    </button>
  );
}

describe('useConfigValue', () => {
  it('re-renders only the components whose slice changed', () => {
    const initial: Config = { info: { campaign_name: 'first' }, neuron_sets: {} };
    const store = createScanConfigStore(initial);
    render(
      <ScanConfigStoreProvider store={store}>
        <CampaignName />
        <NeuronSets />
      </ScanConfigStoreProvider>
    );
    renders.name = 0;
    renders.sets = 0;

    act(() => screen.getByTestId('add-set').click());

    expect(screen.getByTestId('add-set').textContent).toBe('Added');
    expect(renders).toEqual({ name: 0, sets: 1 });

    act(() => store.set((previous) => ({ ...previous, info: { campaign_name: 'second' } })));

    expect(screen.getByTestId('name').textContent).toBe('{"campaign_name":"second"}');
    expect(renders).toEqual({ name: 1, sets: 1 });
  });

  it('fails loudly outside a provider', () => {
    expect(() => render(<CampaignName />)).toThrow(/ScanConfigStoreProvider/);
  });
});
