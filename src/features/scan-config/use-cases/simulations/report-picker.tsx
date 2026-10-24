import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { PillSelect } from '@/ui/molecules/select/pill-select';

import type { TAssetBackedFile } from '@/features/scan-config/types';

/** The spikes before the voltage reports, and a replay's input spikes last. */
const ORDER: string[] = [
  AssetLabel.spike_report,
  AssetLabel.voltage_report,
  AssetLabel.replay_spikes,
];

/** Reports in the picker's order: by kind, then by name. */
export function byReportKind(a: TAssetBackedFile, b: TAssetBackedFile): number {
  const kind = (f: TAssetBackedFile) => {
    const at = ORDER.indexOf(f.asset.label);
    return at === -1 ? ORDER.length : at;
  };
  return kind(a) - kind(b) || a.asset.path.localeCompare(b.asset.path);
}

/**
 * Switches the file on show between a simulation's reports - its spikes, its
 * voltages - from the bar over the open statistics, which stay up for the
 * next. Shown only where there is more than one to switch between.
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
  if (files.length < 2 || !files.some((f) => f.asset.id === selectedAssetId)) return null;
  return (
    <PillSelect
      label="Report"
      value={selectedAssetId ?? ''}
      options={files.map((f) => ({
        value: f.asset.id,
        label: f.asset.path.split('/').at(-1) ?? f.asset.path,
      }))}
      onChange={(id) => {
        const file = files.find((f) => f.asset.id === id);
        if (file) onSelect(file);
      }}
    />
  );
}
