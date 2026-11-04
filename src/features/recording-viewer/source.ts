import type { Config } from '@/features/scan-config/types';
import type { RecordingSource } from './types';

function idOf(reference: unknown): string | null {
  const first = Array.isArray(reference) ? reference[0] : reference;
  const id = (first as { id_str?: unknown } | null | undefined)?.id_str;
  return typeof id === 'string' && id ? id : null;
}

/** The recording a preprocessing or spike sorting form is working on, once one is picked. */
export function recordingSourceOfConfig(config: Config): RecordingSource | null {
  const initialize = config.initialize as Record<string, unknown> | null | undefined;
  const result = idOf(initialize?.preprocessing_result);
  if (result) return { kind: 'preprocessed', entityId: result };
  const recording = idOf(initialize?.recording);
  return recording ? { kind: 'nwb', entityId: recording } : null;
}
