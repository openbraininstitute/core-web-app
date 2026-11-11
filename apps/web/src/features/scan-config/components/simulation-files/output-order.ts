import { AssetContentType, AssetLabel } from '@/api/entitycore/types/shared/global';

import type { TAssetBackedFile } from '@/features/scan-config/types';

/**
 * A simulation's result files in the order the tab reads them, the first being
 * what it opens on: the file on show, so a pick of another simulation keeps to
 * the same kind of file; then the spikes of its biophysical populations; then a
 * single cell's NWB voltages; then the rest as they come.
 */
export function prioritizeOutputFiles(
  files: readonly TAssetBackedFile[],
  selectedPath: string | undefined
): TAssetBackedFile[] {
  const rank = (file: TAssetBackedFile) => {
    if (file.asset.path === selectedPath) return 0;
    if (file.asset.label === AssetLabel.spike_report) return 1;
    if (
      file.asset.label === AssetLabel.voltage_report &&
      file.asset.content_type === AssetContentType.nwb
    ) {
      return 2;
    }
    return 3;
  };
  return [...files].sort((a, b) => rank(a) - rank(b));
}
