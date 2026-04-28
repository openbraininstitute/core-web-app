import { useEffect, useRef } from 'react';

import type { TActivityCustomFile } from '@/features/scan-config/types';

type Props = {
  configId: string;
  selectedFile?: TActivityCustomFile;
  inputFiles: TActivityCustomFile[];
  outputFiles: TActivityCustomFile[];
  onSelect: (file: TActivityCustomFile) => void;
};

function isSameFile(a: TActivityCustomFile | undefined, b: TActivityCustomFile | undefined) {
  if (!a || !b) return false;
  return a.asset.id === b.asset.id && a.entity.id === b.entity.id;
}

export function useAutoSelectFileOnConfigChange({
  configId,
  selectedFile,
  inputFiles,
  outputFiles,
  onSelect,
}: Props) {
  const previousConfigId = useRef<string | null>(null);
  const pendingOutputSelectionForConfigId = useRef<string | null>(null);

  useEffect(() => {
    if (previousConfigId.current !== configId) {
      previousConfigId.current = configId;
      pendingOutputSelectionForConfigId.current = configId;

      const preferred = outputFiles[0] ?? inputFiles[0];
      if (preferred && !isSameFile(selectedFile, preferred)) {
        onSelect(preferred);
      }
      return;
    }

    if (pendingOutputSelectionForConfigId.current !== configId) return;
    const firstOutput = outputFiles[0];
    if (!firstOutput) return;

    if (!isSameFile(selectedFile, firstOutput)) {
      onSelect(firstOutput);
    }
    pendingOutputSelectionForConfigId.current = null;
  }, [configId, inputFiles, onSelect, outputFiles, selectedFile]);
}
