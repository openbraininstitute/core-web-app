import * as Comlink from 'comlink';

import { NWB_H5_CACHE } from '@/features/ephys-viewer/constants';
import { deltaTimeMs } from '@/features/ephys-viewer/trace-index';
import NWBTrace from '@/features/ephys-viewer/worker/nwb-trace';
import { fetchToFS, unlinkFromFS } from '@/utils/h5/fs';
import { lttbUniform } from '@/utils/lttb';

import type {
  OpenTraceRequest,
  RecordingSeries,
  SweepSeries,
  SweepSeriesRequest,
  SweepSeriesResponse,
  TraceIndex,
} from '@/features/ephys-viewer/trace-index';
import type { DownloadProgress } from '@/utils/h5/fs';

type Session = {
  trace: NWBTrace;
  filename: string;
};

let session: Session | null = null;

async function closeSession(): Promise<void> {
  if (!session) return;

  const { trace, filename } = session;
  session = null;
  trace.destroy();
  await unlinkFromFS(filename);
}

function requireSession(): Session {
  if (!session) throw new Error('NWB trace not opened; call open() first');
  return session;
}

const api = {
  /**
   * Download the asset straight into the Emscripten FS and index it. The bytes never reach
   * the main thread — only the returned structure does.
   */
  async open(
    opts: OpenTraceRequest,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<TraceIndex> {
    await closeSession();

    const { filename } = await fetchToFS({
      url: opts.url,
      headers: opts.headers,
      fileKey: opts.fileKey,
      cacheName: NWB_H5_CACHE,
      extension: '.nwb',
      onProgress,
    });

    const trace = NWBTrace.open(filename);
    session = { trace, filename };

    return trace.buildIndex();
  },

  /**
   * Read the requested sweeps and decimate them down to `desiredLength` points each.
   *
   * Decimation happens here so a sweep's samples are freed as soon as its handful of plot
   * points has been taken — sending the raw samples over would put a protocol's worth of
   * them, potentially hundreds of megabytes, back on the main thread.
   */
  async getSweepSeries(req: SweepSeriesRequest): Promise<SweepSeriesResponse> {
    const { trace } = requireSession();
    const response: SweepSeriesResponse = {};

    req.sweeps.forEach((sweep) => {
      const sweepData = trace.getSweepData(req.cellId, req.protocol, req.repetition, sweep);

      trace.recordingTypes.forEach((recordingType) => {
        const recordings = sweepData[recordingType] ?? [];
        const bucket: RecordingSeries[] = response[recordingType] ?? [];

        recordings.forEach(({ data, ...meta }, recordingIndex) => {
          // The viewer takes units and timebase off the first sweep and applies them to the
          // whole plot, so that is the meta that gets reported back.
          const entry: RecordingSeries = bucket[recordingIndex] ?? { meta, series: [] };
          const deltaTime = deltaTimeMs(entry.meta);

          const start = req.xStart === undefined ? 0 : Math.ceil(req.xStart / deltaTime);
          const end = req.xEnd === undefined ? data.length : Math.ceil(req.xEnd / deltaTime);

          const { x, y } = lttbUniform(data, deltaTime, req.desiredLength, start, end);

          entry.series.push({ sweep, x, y } satisfies SweepSeries);
          bucket[recordingIndex] = entry;
        });

        if (bucket.length > 0) response[recordingType] = bucket;
      });
    });

    return response;
  },

  async close(): Promise<void> {
    await closeSession();
  },
};

export type NWBTraceWorkerApi = typeof api;

Comlink.expose(api);
