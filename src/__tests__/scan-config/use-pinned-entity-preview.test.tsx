import { act, renderHook } from '@testing-library/react';
import { createStore, Provider } from 'jotai';
import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import {
  ScanConfigEntityPreviewOrigin,
  scanConfigEntityPreviewAtom,
} from '@/features/scan-config/bridge/entity-preview';
import { usePinnedEntityPreview } from '@/features/scan-config/components/ui-columns/use-pinned-entity-preview';

import type { ReactNode } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

const MESH = ExtendedEntitiesTypeDict.EMCellMesh;

type HookProps = { dataType: TExtendedEntitiesTypeDict | undefined; ids: string[] };

function setup(initial: HookProps) {
  const store = createStore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  const hook = renderHook((props: HookProps) => usePinnedEntityPreview(props), {
    initialProps: initial,
    wrapper,
  });
  return { store, ...hook };
}

describe('usePinnedEntityPreview', () => {
  it('shows the first entity when nothing is shown', () => {
    const { store } = setup({ dataType: MESH, ids: ['a', 'b', 'c'] });

    expect(store.get(scanConfigEntityPreviewAtom)).toEqual({
      dataType: MESH,
      id: 'a',
      origin: ScanConfigEntityPreviewOrigin.Selection,
    });
  });

  it('leaves an entity the user picked from the config', () => {
    const { store, rerender } = setup({ dataType: MESH, ids: ['a', 'b', 'c'] });

    act(() => store.set(scanConfigEntityPreviewAtom, { dataType: MESH, id: 'b' }));
    rerender({ dataType: MESH, ids: ['a', 'b', 'c'] });

    expect(store.get(scanConfigEntityPreviewAtom)?.id).toBe('b');
  });

  it('falls back to the new first entity when the shown one is removed', () => {
    const { store, rerender } = setup({ dataType: MESH, ids: ['a', 'b'] });

    rerender({ dataType: MESH, ids: ['b'] });

    expect(store.get(scanConfigEntityPreviewAtom)?.id).toBe('b');
  });

  it('resets a preview that points outside the config', () => {
    const { store, rerender } = setup({ dataType: MESH, ids: ['a'] });

    act(() => store.set(scanConfigEntityPreviewAtom, { dataType: MESH, id: 'gone' }));
    rerender({ dataType: MESH, ids: ['a'] });

    expect(store.get(scanConfigEntityPreviewAtom)?.id).toBe('a');
  });

  it('does nothing without a data type', () => {
    const { store } = setup({ dataType: undefined, ids: ['a'] });

    expect(store.get(scanConfigEntityPreviewAtom)).toBeNull();
  });

  it('clears the preview once the config is emptied', () => {
    const { store, rerender } = setup({ dataType: MESH, ids: ['a'] });

    rerender({ dataType: MESH, ids: [] });

    expect(store.get(scanConfigEntityPreviewAtom)).toBeNull();
  });

  it('does nothing for an empty config', () => {
    const { store } = setup({ dataType: MESH, ids: [] });

    expect(store.get(scanConfigEntityPreviewAtom)).toBeNull();
  });
});
