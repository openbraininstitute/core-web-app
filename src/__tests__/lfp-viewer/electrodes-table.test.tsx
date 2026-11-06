import { render } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ComponentProps } from 'react';
import type { NodesGrid } from '@/features/circuit-nodes/components/nodes-grid';

type GridProps = ComponentProps<typeof NodesGrid>;

const fixtures = vi.hoisted(() => ({ grid: vi.fn() }));

vi.mock('@/features/circuit-nodes/components/nodes-grid', () => ({
  NodesGrid: (props: unknown) => {
    fixtures.grid(props);
    return null;
  },
  defaultVisibleColumnSet: (columns: { name: string }[]) => new Set(columns.map((c) => c.name)),
}));

import { ElectrodesTable } from '@/features/lfp-viewer/electrodes-table';

const lastGrid = () => fixtures.grid.mock.calls.at(-1)?.[0] as GridProps;

function table(props: Partial<ComponentProps<typeof ElectrodesTable>> = {}) {
  return (
    <ElectrodesTable
      contacts={3}
      statNames={[]}
      stats={new Float32Array(0)}
      shares={null}
      positions={null}
      blocks={null}
      ticked={[]}
      onTick={() => {}}
      reset={{ picked: false, onReset: () => {} }}
      selectedContact={null}
      {...props}
    />
  );
}

describe('ElectrodesTable', () => {
  beforeEach(() => fixtures.grid.mockClear());

  it('ticks a clicked row, as a voltage report does, and leaves the selection to the traces', () => {
    const onTick = vi.fn();
    render(table({ onTick }));

    act(() => lastGrid().onRowClick?.(2));

    expect(onTick).toHaveBeenCalledWith(2);
    expect(lastGrid().focusRow).toBeUndefined();
  });

  it('marks the selected contact and brings each new selection into view', () => {
    const { rerender } = render(table({ selectedContact: 1 }));
    expect(lastGrid().markedNodeId).toBe(1);
    const first = lastGrid().focusRow;
    expect(first?.nodeId).toBe(1);

    rerender(table({ selectedContact: 2 }));

    expect(lastGrid().focusRow?.nodeId).toBe(2);
    expect(lastGrid().focusRow?.key).not.toBe(first?.key);
  });
});
