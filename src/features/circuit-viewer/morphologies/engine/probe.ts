/** The least a storage binding and a buffer must hold, bytes: a large circuit's coarsest level in one buffer. */
const LEAST_BUFFER = 512 * 2 ** 20;
/** The most asked of either, bytes; asking allocates nothing. */
const MOST_BUFFER = 2 * 2 ** 30;

/** A WebGPU device the circuit engine can draw on, or why there is none. */
export type Probed = { device: GPUDevice } | { reason: string };

/** The engine unfit for the device it was given, its message why: drawn with WebGL 2. */
export class Unfit extends Error {
  override name = 'Unfit';
}

/**
 * A device on the high-performance adapter, with every feature it has and its buffers up to `MOST_BUFFER`; none on a
 * software adapter, or one whose buffers hold under `LEAST_BUFFER`.
 */
export async function probeWebGPU(gpu: GPU): Promise<Probed> {
  const adapter = await gpu
    .requestAdapter({ powerPreference: 'high-performance' })
    .catch(() => null);
  if (!adapter) return { reason: 'no graphics adapter for WebGPU' };
  // Before Chrome 130 the flag was the adapter's own.
  const older = adapter as GPUAdapter & { isFallbackAdapter?: boolean };
  if (adapter.info?.isFallbackAdapter ?? older.isFallbackAdapter) {
    return { reason: 'a software adapter' };
  }
  const { maxStorageBufferBindingSize, maxBufferSize } = adapter.limits;
  if (Math.min(maxStorageBufferBindingSize, maxBufferSize) < LEAST_BUFFER) {
    return { reason: 'buffers under 512 MiB' };
  }
  try {
    const device = await adapter.requestDevice({
      requiredFeatures: [...adapter.features] as GPUFeatureName[],
      requiredLimits: {
        maxStorageBufferBindingSize: Math.min(maxStorageBufferBindingSize, MOST_BUFFER),
        maxBufferSize: Math.min(maxBufferSize, MOST_BUFFER),
      },
    });
    return { device };
  } catch {
    return { reason: 'the device was refused' };
  }
}
