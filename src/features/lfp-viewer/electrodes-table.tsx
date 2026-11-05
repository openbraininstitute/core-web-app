'use client';

import { Table } from 'antd';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { TableColumnsType } from 'antd';
import type { ContactBlock } from '@/features/lfp-viewer/contacts';

type Row = {
  key: number;
  contact: number;
  block: string;
  x?: number;
  y?: number;
  z?: number;
  [stat: string]: number | string | undefined;
};

const STAT_COLUMNS: { key: string; title: string; digits: number }[] = [
  { key: 'min', title: 'Min (µV)', digits: 1 },
  { key: 'max', title: 'Max (µV)', digits: 1 },
  { key: 'ptp', title: 'P–p (µV)', digits: 1 },
  { key: 'rms', title: 'RMS (µV)', digits: 1 },
  { key: 'trough_ms', title: 'Trough (ms)', digits: 0 },
];

const HEADER_PX = 40;
const TICK_PX = 36;

function numberColumn(key: string, title: string, digits: number): TableColumnsType<Row>[number] {
  return {
    key,
    dataIndex: key,
    title,
    align: 'right',
    width: 96,
    sorter: (a, b) => Number(a[key] ?? 0) - Number(b[key] ?? 0),
    render: (value?: number) => (value === undefined ? '' : value.toFixed(digits)),
  };
}

/**
 * The report's contacts, one a row: where each is and its field's statistics
 * over the run. Ticked rows are the traces drawn; a click picks a contact.
 */
export function ElectrodesTable({
  contacts,
  statNames,
  stats,
  positions,
  blocks,
  ticked,
  onTickedChange,
  selectedContact,
  onContactClick,
}: {
  contacts: number;
  /** The summary's stats columns, in the order `stats` holds them per contact. */
  statNames: readonly string[];
  stats: Float32Array;
  positions: Float32Array | null;
  blocks: readonly ContactBlock[] | null;
  ticked: readonly number[];
  onTickedChange: (contacts: number[]) => void;
  selectedContact: number | null;
  onContactClick: (contact: number) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(() => setHeight(box.clientHeight));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const rows = useMemo<Row[]>(() => {
    const blockOf = (c: number) =>
      blocks?.find((b) => c >= b.first && c < b.first + b.count)?.name ?? '';
    return Array.from({ length: contacts }, (_, c) => {
      const row: Row = { key: c, contact: c, block: blockOf(c) };
      if (positions) {
        row.x = positions[c * 3];
        row.y = positions[c * 3 + 1];
        row.z = positions[c * 3 + 2];
      }
      statNames.forEach((name, i) => {
        row[name] = stats[c * statNames.length + i];
      });
      return row;
    });
  }, [contacts, statNames, stats, positions, blocks]);

  const columns = useMemo<TableColumnsType<Row>>(
    () => [
      {
        key: 'contact',
        dataIndex: 'contact',
        title: 'Contact',
        width: 80,
        sorter: (a, b) => a.contact - b.contact,
        render: (c: number) => `e${c}`,
      },
      ...(blocks && blocks.length > 1
        ? [{ key: 'block', dataIndex: 'block', title: 'Block', width: 120, ellipsis: true }]
        : []),
      ...(positions
        ? (['x', 'y', 'z'] as const).map((axis) => numberColumn(axis, `${axis} (µm)`, 0))
        : []),
      ...STAT_COLUMNS.filter((s) => statNames.includes(s.key)).map((s) =>
        numberColumn(s.key, s.title, s.digits)
      ),
    ],
    [blocks, positions, statNames]
  );

  return (
    <div ref={boxRef} className="min-h-0 flex-1">
      {height > 0 && (
        <Table<Row>
          size="small"
          virtual
          pagination={false}
          dataSource={rows}
          columns={columns}
          scroll={{
            x: columns.reduce((sum, c) => sum + Number(c.width ?? 0), TICK_PX),
            y: Math.max(80, height - HEADER_PX),
          }}
          rowSelection={{
            selectedRowKeys: ticked as number[],
            onChange: (keys) => onTickedChange((keys as number[]).slice().sort((a, b) => a - b)),
            columnWidth: TICK_PX,
          }}
          rowClassName={(row) =>
            row.contact === selectedContact ? 'bg-primary-0 cursor-pointer' : 'cursor-pointer'
          }
          onRow={(row) => ({ onClick: () => onContactClick(row.contact) })}
        />
      )}
    </div>
  );
}
