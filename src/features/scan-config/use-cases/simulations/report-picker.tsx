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

/** What a report is, as the picker says it: "Spikes", "Voltage", named where voltages are several. */
function kindOf(file: TAssetBackedFile, files: TAssetBackedFile[]): string {
  const name = (file.asset.path.split('/').at(-1) ?? file.asset.path).replace(/\.h5$/i, '');
  if (file.asset.label === AssetLabel.spike_report) return 'Spikes';
  if (file.asset.label === AssetLabel.voltage_report) {
    const voltages = files.filter((f) => f.asset.label === AssetLabel.voltage_report).length;
    return voltages > 1 ? `Voltage (${name})` : 'Voltage';
  }
  return name;
}

/**
 * Switches what the open statistics show between a simulation's reports and
 * their populations - "Spikes: S1nonbarrel_neurons" - from the bar over them,
 * which stay up for the next. A report not yet opened is listed by its kind
 * alone, until it has been and its populations are known.
 */
export function ReportPicker({
  files,
  selectedAssetId,
  onSelect,
}: {
  files: TAssetBackedFile[];
  selectedAssetId: string | undefined;
  onSelect: (file: TAssetBackedFile) => void;
}) {
  const published = useAtomValue(reportPopulationsAtom);
  const choose = useSetAtom(chosenReportPopulationAtom);
  const selected = files.find((f) => f.asset.id === selectedAssetId);
  if (!selected) return null;

  const options = files.flatMap((file) => {
    const kind = kindOf(file, files);
    const held = published[file.asset.path];
    return held && held.populations.length > 0
      ? held.populations.map((population) => ({
          value: `${file.asset.id}${SEPARATOR}${population}`,
          label: `${kind}: ${population}`,
        }))
      : [{ value: `${file.asset.id}${SEPARATOR}`, label: kind }];
  });
  const shown = published[selected.asset.path];

  return (
    <PillSelect
      // "Spikes: S1nonbarrel_neurons" says what it is.
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
