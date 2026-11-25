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
  /** Opt-in: a task log picked while `false` gives way to the first result file once `true`. */
  resultReady?: boolean;
  /** While `true`, a finished run's files are loading and nothing is picked. */
  awaitingResult?: boolean;
};

const NO_FILES: TActivityCustomFile[] = [];

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
  awaitingResult,
}: Props) {
  const previousConfigId = useRef<string | null>(null);
  const pendingOutputSelectionForConfigId = useRef<string | null>(null);
  const provisionalPick = useRef<TActivityCustomFile | null>(null);

  useEffect(() => {
    const inputs = awaitingResult ? NO_FILES : inputFiles;
    const outputs = awaitingResult ? NO_FILES : outputFiles;
    const tracksLog = resultReady === false && outputs.some(isTaskLogsFile);

    if (previousConfigId.current !== configId) {
      previousConfigId.current = configId;
      pendingOutputSelectionForConfigId.current = configId;

      const preferred = outputs[0] ?? inputs[0];
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
        const result = outputs.find((file) => !isTaskLogsFile(file));
        if (result) {
          provisionalPick.current = null;
          pendingOutputSelectionForConfigId.current = null;
          onSelect(result);
          return;
        }
      }
    }

    if (pendingOutputSelectionForConfigId.current !== configId) return;
    const firstOutput = outputs[0];
    if (!firstOutput) return;

    if (!isSameFile(selectedFile, firstOutput)) {
      onSelect(firstOutput);
    }
    pendingOutputSelectionForConfigId.current = null;
  }, [configId, inputFiles, onSelect, outputFiles, selectedFile, resultReady, awaitingResult]);
}
