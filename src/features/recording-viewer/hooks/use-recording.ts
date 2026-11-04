import { wrap } from 'comlink';
import { useEffect, useState } from 'react';

import { buildAssetDownloadRequest, listDirectoryOfAssets } from '@/api/entitycore/queries/assets';
import { getExtracellularRecording } from '@/api/entitycore/queries/experimental/extracellular-recording';
import { getTaskResult } from '@/api/entitycore/queries/task';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';

import type { Remote } from 'comlink';
import type { WorkspaceContext } from '@/types/common';
import type { PreprocessedFiles, RecordingInfo, RecordingSource } from '../types';
import type { RecordingWorkerImpl } from '../worker/recording.worker';

const RECORDING_FOLDER = /^preprocessed_([^/]+)\/(.+)$/;
/** The files of a recording's folder its traces and electrodes are read from. */
const NEEDED = /^(binary\.json|probegroup\.json|traces_cached_seg\d+\.raw|properties\/.+\.npy)$/;

async function preprocessedFiles(
  entityId: string,
  ctx: WorkspaceContext
): Promise<PreprocessedFiles[]> {
  const result = await getTaskResult({ id: entityId, context: ctx });
  const asset = result?.assets?.find((a) => a.label === AssetLabel.task_result);
  if (!asset) throw new Error('This preprocessing result has no output folder');

  const { files } = await listDirectoryOfAssets({
    ctx,
    entityType: EntityTypeDict.TaskResult,
    entityId,
    id: asset.id,
  });
  const recordings = new Map<string, PreprocessedFiles['files']>();
  await Promise.all(
    Object.entries(files).map(async ([path, file]) => {
      const match = path.match(RECORDING_FOLDER);
      if (!match || !NEEDED.test(match[2])) return;
      const request = await buildAssetDownloadRequest({
        ctx,
        entityType: EntityTypeDict.TaskResult,
        entityId,
        id: asset.id,
        assetPath: path,
      });
      const recording = recordings.get(match[1]) ?? {};
      recording[match[2]] = { ...request, size: file.size };
      recordings.set(match[1], recording);
    })
  );
  const found = [...recordings.entries()]
    .filter(([, recording]) => recording['binary.json'])
    .map(([name, recording]) => ({ name, files: recording }));
  if (found.length === 0) throw new Error('This preprocessing result kept no recording');
  return found;
}

async function open(
  source: RecordingSource,
  ctx: WorkspaceContext,
  worker: Remote<RecordingWorkerImpl>
): Promise<RecordingInfo[]> {
  if (source.kind === 'preprocessed') {
    return worker.openPreprocessed(await preprocessedFiles(source.entityId, ctx));
  }
  const recording = await getExtracellularRecording({ id: source.entityId, context: ctx });
  const asset = recording.assets?.find((a) => a.label === AssetLabel.nwb);
  if (!asset) throw new Error('This recording has no NWB file');
  const request = await buildAssetDownloadRequest({
    ctx,
    entityType: EntityTypeDict.ExtracellularRecording,
    entityId: source.entityId,
    id: asset.id,
  });
  return worker.openNwb({ request, size: asset.size });
}

type State = { recordings: RecordingInfo[]; worker: Remote<RecordingWorkerImpl> };

/** Opens a recording in a worker of its own, which reads only the windows asked of it. */
export function useRecording(source: RecordingSource, ctx: WorkspaceContext) {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const { kind, entityId } = source;
  const { virtualLabId, projectId } = ctx;

  useEffect(() => {
    let cancelled = false;
    setState(null);
    setError(null);
    const raw = new Worker(new URL('../worker/recording.worker.ts', import.meta.url), {
      type: 'module',
    });
    const worker = wrap<RecordingWorkerImpl>(raw);
    open({ kind, entityId }, { virtualLabId, projectId }, worker)
      .then((recordings) => {
        if (!cancelled) setState({ recordings, worker });
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      });
    return () => {
      cancelled = true;
      worker.destroy().catch(() => {});
      raw.terminate();
    };
  }, [kind, entityId, virtualLabId, projectId]);

  return { recordings: state?.recordings ?? null, worker: state?.worker ?? null, error };
}
