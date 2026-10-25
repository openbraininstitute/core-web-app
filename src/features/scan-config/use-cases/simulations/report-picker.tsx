import { useAtomValue, useSetAtom } from 'jotai';

import { AssetLabel } from '@/api/entitycore/types/shared/global';
import {
  chosenReportPopulationAtom,
  reportPopulationsAtom,
} from '@/features/spike-viewer/report-populations';
import { PillSelect } from '@/ui/molecules/select/pill-select';

import type { TAssetBackedFile } from '@/features/scan-config/types';

/** The spikes before the voltage reports, and a replay's input spikes last. */
const ORDER: string[] = [
  AssetLabel.spike_report,
  AssetLabel.voltage_report,
  AssetLabel.replay_spikes,
];

/** Joins a report and one of its populations into one option's value. */
const SEPARATOR = '\u0000';

/** Reports in the picker's order: by kind, then by name. */
export function byReportKind(a: TAssetBackedFile, b: TAssetBackedFile): number {
  const kind = (f: TAssetBackedFile) => {
    const at = ORDER.indexOf(f.asset.label);
    return at === -1 ? ORDER.length : at;
  };
  return kind(a) - kind(b) || a.asset.path.localeCompare(b.asset.path);
}

/** A report's file name without its extension. */
export function reportStem(file: TAssetBackedFile): string {
  return (file.asset.path.split('/').at(-1) ?? file.asset.path).replace(/\.h5$/i, '');
}

/**
 * How a report is named, by the files column and the picker: a spike file by
 * the population, another by its file's name, with the population where it
 * records several.
 */
export function reportName(
  file: TAssetBackedFile,
  population: string | undefined,
  populations: number
): string {
  if (file.asset.label === AssetLabel.spike_report && population) return population;
  const stem = reportStem(file);
  return population && populations > 1 ? `${stem} · ${population}` : stem;
}

/**
 * What a report records, word by word, for the tag beside its name: "Spikes",
 * "Input spikes", or for a compartment report, from its entry in the SONATA
 * config, where and what: "Soma voltages". Until the config is read a voltage
 * report is one all the same.
 */
export function reportTag(
  file: TAssetBackedFile,
  reports: Readonly<Record<string, unknown>> | null | undefined
): string[] {
  if (file.asset.label === AssetLabel.spike_report) return ['Spikes'];
  if (file.asset.label === AssetLabel.replay_spikes) return ['Input', 'spikes'];
  const report = reports?.[reportStem(file)];
  const entry = isPlainObject(report) ? report : {};
  const variable = typeof entry.variable_name === 'string' ? entry.variable_name : 'v';
  const sections = typeof entry.sections === 'string' ? entry.sections : 'soma';
  const where =
    entry.type === 'compartment_set'
      ? 'Compartment'
      : sections === 'soma'
        ? 'Soma'
        : sections === 'all'
          ? 'Compartment'
          : sections.charAt(0).toUpperCase() + sections.slice(1);
  return [where, variable === 'v' ? 'voltages' : variable];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Switches what the open statistics show between a simulation's reports, its
 * inputs' spikes among them, and their populations, from the bar over them,
 * which stay up for the next: each named as the files column names it, its
 * kind tagged after. A report not yet opened is listed once, until it has been
 * and its populations are known.
 */
export function ReportPicker({
  files,
  selectedAssetId,
  onSelect,
  reports,
}: {
  files: TAssetBackedFile[];
  selectedAssetId: string | undefined;
  onSelect: (file: TAssetBackedFile) => void;
  /** The SONATA config's reports, by name: what each records. */
  reports?: Readonly<Record<string, unknown>> | null;
}) {
  const published = useAtomValue(reportPopulationsAtom);
  const choose = useSetAtom(chosenReportPopulationAtom);
  const selected = files.find((f) => f.asset.id === selectedAssetId);
  if (!selected) return null;

  const options = files.flatMap((file) => {
    const tag = reportTag(file, reports).join(' ');
    const populations = published[file.asset.path]?.populations ?? [];
    return populations.length > 0
      ? populations.map((population) => ({
          value: `${file.asset.id}${SEPARATOR}${population}`,
          label: reportName(file, population, populations.length),
          tag,
        }))
      : [{ value: `${file.asset.id}${SEPARATOR}`, label: reportName(file, undefined, 0), tag }];
  });
  const shown = published[selected.asset.path];

  return (
    <PillSelect
      // The name and its tag say what it is.
      label=""
      title="The report on show, and its population"
      value={`${selected.asset.id}${SEPARATOR}${shown?.current ?? ''}`}
      options={options}
      onChange={(value) => {
        const [id, population] = value.split(SEPARATOR);
        const file = files.find((f) => f.asset.id === id);
        if (!file) return;
        if (population) choose((previous) => ({ ...previous, [file.asset.path]: population }));
        if (id !== selected.asset.id) onSelect(file);
      }}
    />
  );
}
