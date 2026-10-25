'use client';

import { atom, useAtom } from 'jotai';

import { DEFAULT_PSTH } from '@/features/spike-viewer/spike-statistics/figures';
import { PillSelect } from '@/ui/molecules/select/pill-select';

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

/** A PSTH's bin size and Gaussian smoothing, beside the plot it shapes. */
export function PsthControls() {
  const [{ binMs, sigmaMs }, setOptions] = useAtom(psthOptionsAtom);
  return (
    <>
      <PillSelect
        label="Bin size"
        title="Each bin's width: Auto takes about a hundred round ones over the span"
        value={binMs === null ? AUTO : String(binMs)}
        options={BIN_OPTIONS}
        onChange={(value) =>
          setOptions((previous) => ({ ...previous, binMs: value === AUTO ? null : Number(value) }))
        }
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
