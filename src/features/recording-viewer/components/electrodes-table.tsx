import { Checkbox } from 'antd';

import { TRACE_COLORS } from '@/features/sonata-viewer/constants';
import { cn } from '@/utils/css-class';

import type { PickedTrace } from '@/features/sonata-viewer/types';
import type { ElectrodeTable } from '../types';

function cellText(value: string | number | null | undefined) {
  if (value === null || value === undefined) return '';
  return typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(2) : String(value);
}

/**
 * The recording's electrodes, one row per channel. It drives the plot above as a report's table
 * of cells does: ticked rows are drawn in their colours, and the row under the pointer is shown
 * for as long as it is there.
 */
export function ElectrodesTable({
  table,
  picked,
  onTogglePick,
  onHover,
}: {
  table: ElectrodeTable;
  picked: PickedTrace[];
  onTogglePick: (channel: number) => void;
  onHover: (channel: number | null) => void;
}) {
  const slotOf = new Map(picked.map((pick) => [pick.traceIndex, pick.slot]));
  return (
    <div
      className="secondary-scrollbar min-h-0 flex-1 overflow-auto rounded border border-neutral-200"
      data-testid="recording-electrodes"
      onMouseLeave={() => onHover(null)}
    >
      <table className="w-full border-collapse text-xs">
        <thead className="sticky top-0 z-1 bg-neutral-50 text-left text-neutral-500">
          <tr>
            <th className="w-8 px-2 py-1" aria-label="Pick" />
            {table.columns.map((column) => (
              <th key={column.key} className="whitespace-nowrap px-2 py-1 font-medium">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, channel) => {
            const slot = slotOf.get(channel);
            return (
              <tr
                // biome-ignore lint/suspicious/noArrayIndexKey: a row is its channel's position
                key={channel}
                className={cn('cursor-pointer border-t border-neutral-100 hover:bg-primary-0', {
                  'bg-primary-0/50': slot !== undefined,
                })}
                onMouseEnter={() => onHover(channel)}
                onClick={() => onTogglePick(channel)}
              >
                <td className="px-2 py-0.5">
                  <Checkbox checked={slot !== undefined} />
                  {slot !== undefined && slot >= 0 && (
                    <span
                      className="ml-1 inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: TRACE_COLORS[slot] }}
                    />
                  )}
                </td>
                {table.columns.map((column) => (
                  <td key={column.key} className="whitespace-nowrap px-2 py-0.5 text-neutral-700">
                    {cellText(row[column.key])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
