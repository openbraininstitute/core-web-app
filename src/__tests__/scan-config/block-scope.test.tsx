import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { Profiler } from 'react';
import { describe, expect, it, vi } from 'vitest';

import Block from '@/features/scan-config/components/ui-blocks/block';
import { createBlockScope, createScanConfigStore } from '@/features/scan-config/store';
import {
  type ConfigSchema,
  ScanConfigUIElementDict,
  type TBlock,
} from '@/features/scan-config/types';
import {
  BlockScopeProvider,
  ScanConfigErrorsProvider,
  ScanConfigStoreProvider,
  useBlockValue,
  useField,
  useUpdateBlock,
} from '@/features/scan-config/use-config-store';

import type { ReactNode } from 'react';
import type { TBlockState } from '@/features/scan-config/types';

const config = (): { info: TBlockState; stimuli: TBlockState } => ({
  info: { campaign_name: 'name', note: 'a' },
  stimuli: { S: { amplitude: 1, delay: 2 } },
});

describe('createBlockScope', () => {
  it('reads a root block and one entry of a dictionary', () => {
    const store = createScanConfigStore(config());

    expect(createBlockScope(store, 'info').getSnapshot()).toEqual({
      campaign_name: 'name',
      note: 'a',
    });
    expect(createBlockScope(store, 'stimuli', 'S').getSnapshot()).toEqual({
      amplitude: 1,
      delay: 2,
    });
  });

  it('reads the same empty block while the block does not exist', () => {
    const scope = createBlockScope(createScanConfigStore(config()), 'stimuli', 'missing');

    expect(scope.getSnapshot()).toEqual({});
    expect(scope.getSnapshot()).toBe(scope.getSnapshot());
  });

  it('keeps both of two updates made in a row', () => {
    const store = createScanConfigStore(config());
    const scope = createBlockScope(store, 'stimuli', 'S');

    scope.update((previous) => ({ ...previous, amplitude: 5 }));
    scope.update((previous) => ({ ...previous, delay: 7 }));

    expect(store.getSnapshot().stimuli).toEqual({ S: { amplitude: 5, delay: 7 } });
    expect(store.getSnapshot().info).toEqual({ campaign_name: 'name', note: 'a' });
  });

  it('keeps its snapshot while another block changes', () => {
    const store = createScanConfigStore(config());
    const scope = createBlockScope(store, 'info');
    const before = scope.getSnapshot();

    store.set((previous) => ({ ...previous, stimuli: {} }));

    expect(scope.getSnapshot()).toBe(before);
  });

  it('does not notify when an update returns the same block', () => {
    const store = createScanConfigStore(config());
    const listener = vi.fn();
    store.subscribe(listener);

    createBlockScope(store, 'info').update((previous) => previous);

    expect(listener).not.toHaveBeenCalled();
  });
});

function setup(preview?: TBlockState) {
  const store = createScanConfigStore(config());
  const commits = { count: 0 };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ScanConfigStoreProvider store={store}>
      <BlockScopeProvider rootElement="info" preview={preview}>
        <Profiler
          id="reader"
          onRender={() => {
            commits.count += 1;
          }}
        >
          {children}
        </Profiler>
      </BlockScopeProvider>
    </ScanConfigStoreProvider>
  );

  return { store, commits, wrapper };
}

describe('useField', () => {
  it('gives the value of its key and writes it', () => {
    const { store, wrapper } = setup();
    const { result } = renderHook(() => useField('campaign_name'), { wrapper });

    expect(result.current[0]).toBe('name');
    act(() => result.current[1]('other'));

    expect(result.current[0]).toBe('other');
    expect(store.getSnapshot().info).toEqual({ campaign_name: 'other', note: 'a' });
  });

  it('removes the key when it is set to undefined', () => {
    const { store, wrapper } = setup();
    const { result } = renderHook(() => useField('note'), { wrapper });

    act(() => result.current[1](undefined));

    expect(store.getSnapshot().info).toEqual({ campaign_name: 'name' });
  });

  it('does not re-render while a sibling field changes', () => {
    const { store, commits, wrapper } = setup();
    renderHook(() => useField('campaign_name'), { wrapper });
    const before = commits.count;

    act(() => store.set(() => ({ ...config(), info: { campaign_name: 'name', note: 'b' } })));

    expect(commits.count).toBe(before);
  });

  it('reads the preview instead of the stored block when one is given', () => {
    const { wrapper } = setup({ campaign_name: 'previewed' });
    const { result } = renderHook(() => useField('campaign_name'), { wrapper });

    expect(result.current[0]).toBe('previewed');
  });
});

describe('useBlockValue', () => {
  const selectNote = (block: TBlockState) => block.note;

  it('re-renders only when the selected value changes', () => {
    const { store, commits, wrapper } = setup();
    const { result } = renderHook(() => useBlockValue(selectNote), { wrapper });
    const before = commits.count;

    act(() => store.set(() => ({ ...config(), info: { campaign_name: 'x', note: 'a' } })));
    expect(commits.count).toBe(before);

    act(() => store.set(() => ({ ...config(), info: { campaign_name: 'name', note: 'b' } })));
    expect(result.current).toBe('b');
    expect(commits.count).toBe(before + 1);
  });
});

describe('useUpdateBlock', () => {
  it('writes several keys from the latest block', () => {
    const { store, wrapper } = setup();
    const { result } = renderHook(() => useUpdateBlock(), { wrapper });

    act(() => {
      result.current((previous) => ({ ...previous, note: 'b' }));
      result.current((previous) => ({ ...previous, campaign_name: 'x', extra: 1 }));
    });

    expect(store.getSnapshot().info).toEqual({ campaign_name: 'x', note: 'b', extra: 1 });
  });
});

const BLOCK_SCHEMA = {
  title: 'Info',
  description: '',
  required: ['campaign_name'],
  properties: {
    campaign_name: { title: 'Campaign name', ui_element: ScanConfigUIElementDict.StringInput },
    note: { title: 'Note', ui_element: ScanConfigUIElementDict.StringInput },
  },
} as unknown as TBlock;

const SCHEMA = { properties: {}, default_block_reference_labels: {} } as unknown as ConfigSchema;

function renderBlock() {
  const store = createScanConfigStore(config());
  render(
    <ScanConfigStoreProvider store={store}>
      <ScanConfigErrorsProvider schema={SCHEMA}>
        <BlockScopeProvider rootElement="info">
          <Block
            schema={SCHEMA}
            disabled={false}
            blockSchema={BLOCK_SCHEMA}
            entity={null}
            schemaMappingConfig={undefined}
            rootElement="info"
          />
        </BlockScopeProvider>
      </ScanConfigErrorsProvider>
    </ScanConfigStoreProvider>
  );
  const input = (field: string) =>
    screen.getByTestId(`scan-config-field-${field}`).querySelector('input') as HTMLInputElement;

  return { store, input };
}

describe('Block', () => {
  it('writes only the edited field', () => {
    const { store, input } = renderBlock();

    fireEvent.change(input('note'), { target: { value: 'b' } });

    expect(store.getSnapshot().info).toEqual({ campaign_name: 'name', note: 'b' });
    expect(input('campaign_name').value).toBe('name');
  });

  it('shows Required on an emptied required field and clears it when filled', () => {
    const { input } = renderBlock();

    fireEvent.change(input('campaign_name'), { target: { value: '' } });
    expect(screen.getByText('Required')).toBeTruthy();

    fireEvent.change(input('campaign_name'), { target: { value: 'again' } });
    expect(screen.queryByText('Required')).toBeNull();
  });
});
