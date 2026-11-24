import { useEffect, useRef } from 'react';

import { isAssetBackedFile } from '@/features/scan-config/types';
import { isTaskLogsFile } from '@/features/task-logs-stream/descriptor';

import type { TActivityCustomFile } from '@/features/scan-config/types';

type Props = {
  configId: string;
  selectedFile?: TActivityCustomFile;
  inputFiles: TActivityCustomFile[];
  outputFiles: TActivityCustomFile[];
  onSelect: (file: TActivityCustomFile) => void;
  /**
   * Whether the run's result is in. While it is `false`, a picked task log gives way to the
   * first result file once it is `true`; left out, a pick is kept.
   */
  resultReady?: boolean;
};

/** The stable per-row key: every row sets `id`, a file row's asset id, else the entity id. */
function fileKey(file: TActivityCustomFile): string {
  return file.id ?? (isAssetBackedFile(file) ? file.asset.id : undefined) ?? file.entity.id;
}

function isSameFile(a: TActivityCustomFile | undefined, b: TActivityCustomFile | undefined) {
  if (!a || !b) return false;
  return fileKey(a) === fileKey(b) && a.entity.id === b.entity.id;
}

export function useAutoSelectFileOnConfigChange({
  configId,
  selectedFile,
  inputFiles,
  outputFiles,
  onSelect,
  resultReady,
}: Props) {
  const previousConfigId = useRef<string | null>(null);
  const pendingOutputSelectionForConfigId = useRef<string | null>(null);
  const provisionalPick = useRef<TActivityCustomFile | null>(null);

  useEffect(() => {
    const pick = (file: TActivityCustomFile) => {
      if (!isSameFile(selectedFile, file)) onSelect(file);
      provisionalPick.current = resultReady === false && isTaskLogsFile(file) ? file : null;
    };

    if (previousConfigId.current !== configId) {
      previousConfigId.current = configId;
      pendingOutputSelectionForConfigId.current = configId;
      provisionalPick.current = null;

      const preferred = outputFiles[0] ?? inputFiles[0];
      if (preferred) pick(preferred);
      return;
    }

    const provisional = provisionalPick.current;
    if (provisional && !isSameFile(selectedFile, provisional)) {
      provisionalPick.current = null;
    } else if (provisional && resultReady) {
      provisionalPick.current = null;
      const result = outputFiles.find((file) => !isTaskLogsFile(file));
      if (result) onSelect(result);
      return;
    }

    if (pendingOutputSelectionForConfigId.current !== configId) return;
    const firstOutput = outputFiles[0];
    if (!firstOutput) return;

    pick(firstOutput);
    pendingOutputSelectionForConfigId.current = null;
  }, [configId, inputFiles, onSelect, outputFiles, selectedFile, resultReady]);
}
