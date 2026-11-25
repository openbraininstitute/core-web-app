import { act, fireEvent, renderHook, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Block from '@/features/scan-config/components/ui-blocks/block';
import {
  type ConfigSchema,
  ScanConfigUIElementDict,
  type TBlock,
} from '@/features/scan-config/types';
import {
  PropsBlockScopeProvider,
  useBlockValue,
  useField,
  useUpdateBlock,
} from '@/features/scan-config/use-config-store';

import { renderInBlock } from './form-providers';

import type { ReactNode } from 'react';
import type { TBlockState } from '@/features/scan-config/types';

const selectNote = (block: TBlockState) => block.note;

describe('PropsBlockScopeProvider', () => {
  function setup(initial: TBlockState) {
    const setState = vi.fn();
    const current = { state: initial };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <PropsBlockScopeProvider state={current.state} setState={setState}>
        {children}
      </PropsBlockScopeProvider>
    );

    return { setState, current, wrapper };
  }

  it('gives fields the block held in props and writes it back whole', () => {
    const { setState, wrapper } = setup({ name: 'a', note: 'n' });
    const { result } = renderHook(() => useField('name'), { wrapper });

    expect(result.current[0]).toBe('a');
    act(() => result.current[1]('b'));

    expect(setState).toHaveBeenCalledWith({ name: 'b', note: 'n' });
  });

  it('removes the key when a field is set to undefined', () => {
    const { setState, wrapper } = setup({ name: 'a', note: 'n' });
    const { result } = renderHook(() => useField('note'), { wrapper });

    act(() => result.current[1](undefined));

    expect(setState).toHaveBeenCalledWith({ name: 'a' });
  });

  it('keeps both of two updates made before the props change', () => {
    const { setState, wrapper } = setup({ name: 'a', note: 'n' });
    const { result } = renderHook(() => useUpdateBlock(), { wrapper });

    act(() => {
      result.current((previous) => ({ ...previous, name: 'b' }));
      result.current((previous) => ({ ...previous, note: 'm' }));
    });

    expect(setState).toHaveBeenLastCalledWith({ name: 'b', note: 'm' });
  });

  it('follows the block when the props change', () => {
    const { current, wrapper } = setup({ note: 'n' });
    const { result, rerender } = renderHook(() => useBlockValue(selectNote), { wrapper });

    current.state = { note: 'changed' };
    rerender();

    expect(result.current).toBe('changed');
  });
});

const SCHEMA = { properties: {}, default_block_reference_labels: {} } as unknown as ConfigSchema;

const DISTRIBUTION_BLOCK = {
  title: 'Distribution',
  description: '',
  properties: {
    values: { title: 'Values', ui_element: ScanConfigUIElementDict.DiscreteProbabilities },
    label: { title: 'Label', ui_element: ScanConfigUIElementDict.StringInput },
  },
} as unknown as TBlock;

function renderDistribution(state: TBlockState) {
  return renderInBlock(
    <Block
      schema={SCHEMA}
      disabled={false}
      blockSchema={DISTRIBUTION_BLOCK}
      entity={null}
      schemaMappingConfig={undefined}
      rootElement="distribution"
    />,
    'distribution',
    state
  );
}

describe('Block with a field that reads and writes a sibling key', () => {
  it('shows the sibling key and writes both keys together', () => {
    const { store } = renderDistribution({ values: [1, 2], probabilities: [1, 3], label: 'x' });

    expect(screen.getByText('25.0%')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Value 2'), { target: { value: '7' } });

    expect(store.getSnapshot().distribution).toEqual({
      values: [1, 7],
      probabilities: [1, 3],
      label: 'x',
    });
  });

  it('follows a change of the sibling key made elsewhere', () => {
    const { store } = renderDistribution({ values: [1, 2], probabilities: [1, 3] });

    act(() =>
      store.set((previous) => ({
        ...previous,
        distribution: { values: [1, 2], probabilities: [1, 1] },
      }))
    );

    expect(screen.getAllByText('50.0%')).toHaveLength(2);
  });
});
