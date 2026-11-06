'use client';

import { RiArrowDownSLine } from '@remixicon/react';
import { useId, useMemo } from 'react';

import { isTotalField, TOTAL_FIELD } from '@/features/lfp-viewer/use-lfp-summary';
import { Checkbox } from '@/ui/molecules/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { PILL_CLASS, PillSelect } from '@/ui/molecules/select/pill-select';

import type { LfpAxis, LfpSummaryIndex } from '@/features/lfp-viewer/summary';
import type { FieldChoice } from '@/features/lfp-viewer/use-lfp-summary';

const AXIS_LABELS: Record<string, string> = {
  mtype: 'M-type',
  etype: 'E-type',
  synapse_class: 'Synapse class',
  layer: 'Layer',
  region: 'Region',
};

/** An axis's groups, those that make the most of the total first. */
export function groupsByShare(axis: LfpAxis): number[] {
  return axis.groups.map((_, group) => group).sort((a, b) => axis.shares[b] - axis.shares[a]);
}

const percent = (share: number) => `${Math.round(share * 100)}%`;

const LEFT_OUT: Record<string, string> = { memory: 'Too large to build' };

const GROUPS_UNAVAILABLE: Record<string, { detail: string; title: string }> = {
  circuit_not_readable: {
    detail: 'Circuit not readable',
    title:
      'The circuit could not be read when this was summarised, so the field is not split by kind of cell. That is added once someone who can read the circuit opens this',
  },
};

const axisLabel = (name: string) => AXIS_LABELS[name] ?? name;

/** Which cells' field is drawn: the total, or some of the groups of an axis, added up. */
export function FieldFromControls({
  index,
  choice,
  onChange,
}: {
  index: LfpSummaryIndex;
  choice: FieldChoice;
  onChange: (choice: FieldChoice) => void;
}) {
  const leftOut = Object.entries(index.axes_left_out);
  const unavailable = index.groups_unavailable
    ? (GROUPS_UNAVAILABLE[index.groups_unavailable] ?? {
        detail: 'Not available',
        title: 'The field is not split by kind of cell for this report',
      })
    : null;
  if (index.axes.length < 2 && leftOut.length === 0 && !unavailable) return null;
  return (
    <>
      <PillSelect
        label="Field from"
        title={unavailable?.title ?? 'The part of the field that a kind of cell makes'}
        value={String(choice.axis)}
        options={[
          ...index.axes.map((axis, i) => ({
            value: String(i),
            label: i === 0 ? 'All cells' : axisLabel(axis.name),
            detail: i === 0 ? undefined : `${axis.groups.length} groups`,
          })),
          ...leftOut.map(([name, why]) => ({
            value: `left-out-${name}`,
            label: axisLabel(name),
            detail: LEFT_OUT[why] ?? 'Left out',
            disabled: true,
          })),
          ...(unavailable
            ? [
                {
                  value: 'unavailable',
                  label: 'Kinds of cell',
                  detail: unavailable.detail,
                  disabled: true,
                },
              ]
            : []),
        ]}
        onChange={(value) => {
          const axis = Number(value);
          onChange(
            axis === 0 ? TOTAL_FIELD : { axis, groups: [groupsByShare(index.axes[axis])[0]] }
          );
        }}
      />
      {!isTotalField(choice) && (
        <GroupPicker axis={index.axes[choice.axis]} choice={choice} onChange={onChange} />
      )}
    </>
  );
}

function GroupPicker({
  axis,
  choice,
  onChange,
}: {
  axis: LfpAxis;
  choice: FieldChoice;
  onChange: (choice: FieldChoice) => void;
}) {
  const listed = useMemo(() => groupsByShare(axis), [axis]);
  const ticked = listed.filter((group) => choice.groups.includes(group));
  const baseId = useId();
  const shareTogether = ticked.reduce((sum, group) => sum + axis.shares[group], 0);
  return (
    <Popover>
      <PopoverTrigger
        className={PILL_CLASS}
        title={`Added up, they make ${percent(shareTogether)} of the total's variance`}
      >
        <span className="max-w-40 truncate">{axis.groups[ticked[0]]}</span>
        {ticked.length > 1 && <span className="text-neutral-400">+{ticked.length - 1}</span>}
        <RiArrowDownSLine className="size-4 shrink-0" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="max-h-80 w-64 overflow-y-auto rounded-xl border-gray-100 bg-white p-1 shadow-xl"
      >
        <div className="text-neutral-500 px-2 py-1 text-xs">
          Added up. Each with its share of the total&apos;s variance
        </div>
        {listed.map((group) => {
          const id = `${baseId}-${group}`;
          const on = choice.groups.includes(group);
          return (
            <div
              key={group}
              className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-neutral-50"
            >
              <Checkbox
                id={id}
                checked={on}
                // One always stays: no cells make no field to draw.
                disabled={on && choice.groups.length === 1}
                onCheckedChange={(checked) =>
                  onChange({
                    axis: choice.axis,
                    groups:
                      checked === true
                        ? [...choice.groups, group]
                        : choice.groups.filter((g) => g !== group),
                  })
                }
              />
              <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer truncate select-none">
                {axis.groups[group]}
              </label>
              <span className="shrink-0 text-xs text-neutral-400">
                {percent(axis.shares[group])}
              </span>
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
