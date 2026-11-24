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
  /** Opt-in: a task log picked while `false` gives way to the first result file once `true`; needs
   * the outputs empty while a finished run's files load. */
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

function logOrNull(file: TActivityCustomFile | undefined) {
  return file && isTaskLogsFile(file) ? file : null;
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
    const tracksLog = resultReady === false && outputFiles.some(isTaskLogsFile);

    if (previousConfigId.current !== configId) {
      previousConfigId.current = configId;
      pendingOutputSelectionForConfigId.current = configId;

      const preferred = outputFiles[0] ?? inputFiles[0];
      provisionalPick.current = tracksLog ? logOrNull(preferred) : null;
      if (preferred && !isSameFile(selectedFile, preferred)) {
        onSelect(preferred);
      }
      return;
    }

    if (tracksLog) {
      provisionalPick.current = logOrNull(selectedFile);
    } else if (resultReady && provisionalPick.current) {
      if (!isSameFile(selectedFile, provisionalPick.current)) {
        provisionalPick.current = null;
      } else {
        const result = outputFiles.find((file) => !isTaskLogsFile(file));
        if (result) {
          provisionalPick.current = null;
          pendingOutputSelectionForConfigId.current = null;
          onSelect(result);
          return;
        }
      }
    }

    if (pendingOutputSelectionForConfigId.current !== configId) return;
    const firstOutput = outputFiles[0];
    if (!firstOutput) return;

    if (!isSameFile(selectedFile, firstOutput)) {
      onSelect(firstOutput);
    }
    pendingOutputSelectionForConfigId.current = null;
  }, [configId, inputFiles, onSelect, outputFiles, selectedFile, resultReady]);
}
