'use client';

import { atom, useAtom } from 'jotai';
import { useId } from 'react';

import { DEFAULT_PSTH } from '@/features/spike-viewer/spike-statistics/figures';
import { Checkbox } from '@/ui/molecules/checkbox';
import { PILL_CLASS, PillSelect } from '@/ui/molecules/select/pill-select';
import { cn } from '@/utils/css-class';

import type { PsthOptions } from '@/features/spike-viewer/spike-statistics/figures';

/** How the PSTHs bin and smooth, the simulation's and the campaign's alike, kept across picks. */
export const psthOptionsAtom = atom<PsthOptions>(DEFAULT_PSTH);

const AUTO = 'auto';
const BIN_OPTIONS = [
  { value: AUTO, label: 'Auto' },
  ...[1, 2, 5, 10, 20, 50, 100].map((ms) => ({ value: String(ms), label: `${ms} ms` })),
];
const SIGMA_OPTIONS = [
  { value: '0', label: 'None' },
  ...[1, 2, 5, 10, 20, 50].map((ms) => ({ value: String(ms), label: `σ ${ms} ms` })),
];

/** A bin size as a pill: Auto, or a width in ms. */
function BinSizeSelect({
  binMs,
  onChange,
  title,
}: {
  binMs: number | null;
  onChange: (binMs: number | null) => void;
  title: string;
}) {
  return (
    <PillSelect
      label="Bin size"
      title={title}
      value={binMs === null ? AUTO : String(binMs)}
      options={BIN_OPTIONS}
      onChange={(value) => onChange(value === AUTO ? null : Number(value))}
    />
  );
}

/** A PSTH's bin size and Gaussian smoothing, beside the plot it shapes. */
export function PsthControls() {
  const [{ binMs, sigmaMs }, setOptions] = useAtom(psthOptionsAtom);
  return (
    <>
      <BinSizeSelect
        title="Each bin's width: Auto takes about a hundred round ones over the span"
        binMs={binMs}
        onChange={(next) => setOptions((previous) => ({ ...previous, binMs: next }))}
      />
      <PillSelect
        label="Smoothing"
        title="The σ of a Gaussian the binned rate is run through"
        value={String(sigmaMs)}
        options={SIGMA_OPTIONS}
        onChange={(value) => setOptions((previous) => ({ ...previous, sigmaMs: Number(value) }))}
      />
    </>
  );
}

/** The bins the cells' firing is counted in for its principal components; Auto at first. */
export const pcaBinAtom = atom<number | null>(null);

/** The PCA's bin size, beside its plot: apart from the PSTHs', which suit finer bins. */
export function PcaControls() {
  const [binMs, setBinMs] = useAtom(pcaBinAtom);
  return (
    <BinSizeSelect
      title="The width of the bins each cell's spikes are counted in: Auto takes about a hundred round ones over the span"
      binMs={binMs}
      onChange={setBinMs}
    />
  );
}

/** How many standard deviations out the PCA draws each group's spread round its mean; 0 for none. */
export const pcaSpreadAtom = atom(0);

const SPREAD_OPTIONS = [
  { value: '0', label: 'None' },
  ...[1, 2, 3].map((n) => ({ value: String(n), label: `${n} SD` })),
];

/** After Group by: a ring round each group's mean in 2D, a shell in 3D, so many SD out. */
export function PcaSpreadControl({ threeD }: { threeD: boolean }) {
  const [spread, setSpread] = useAtom(pcaSpreadAtom);
  return (
    <PillSelect
      label={threeD ? 'Spheres' : 'Rings'}
      title={`An ${threeD ? 'ellipsoid' : 'ellipse'} round each group's mean, following the group's own spread, so many standard deviations out`}
      value={String(spread)}
      options={SPREAD_OPTIONS}
      onChange={(value) => setSpread(Number(value))}
    />
  );
}

/** Whether a grouped PCA draws its cells under the groups' means; at first only the means. */
export const pcaPointsAtom = atom(false);

/** After Group by: the cells themselves as well as their groups' means. */
export function PcaPointsControl() {
  const [points, setPoints] = useAtom(pcaPointsAtom);
  const id = useId();
  return (
    <div className={cn(PILL_CLASS, 'gap-2')} title="Each cell's own point under its group's mean">
      <Checkbox
        id={id}
        checked={points}
        onCheckedChange={(checked) => setPoints(checked === true)}
      />
      <label htmlFor={id} className="cursor-pointer select-none">
        Points
      </label>
    </div>
  );
}
