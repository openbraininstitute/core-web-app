import { afterEach, describe, expect, it, vi } from 'vitest';

import { createCircuitView } from '@/features/circuit-viewer/morphologies/engine/create-view';

const h = vi.hoisted(() => {
  /** The WebGL 2 engine, made with its host. */
  class FakeViewer {
    constructor(readonly host: HTMLElement) {}
  }
  /** The WebGPU engine: made on the device, or failing to start where the test says. */
  const gpu = {
    fails: false,
    made: [] as { host: HTMLElement; device: unknown; onLost: () => void }[],
    create: async (host: HTMLElement, device: unknown, onLost: () => void) => {
      if (gpu.fails) throw new Error('no pipeline');
      const view = { host, device, onLost };
      gpu.made.push(view);
      return view;
    },
  };
  return { FakeViewer, gpu, logError: vi.fn() };
});

vi.mock('@/features/circuit-viewer/morphologies/engine/circuit-morphology-viewer', () => ({
  CircuitMorphologyViewer: h.FakeViewer,
}));

vi.mock('@/features/circuit-viewer/morphologies/engine/webgpu/circuit-morphology-gpu', () => ({
  CircuitMorphologyGPU: { create: h.gpu.create },
}));

vi.mock('@/utils/logger', () => ({ logError: h.logError }));

const GIB = 2 ** 30;

/** An adapter with these limits and features, as fit for the engine as the test says, and its device. */
function adapterOf({
  fallback = false,
  older = false,
  binding = 4 * GIB,
  buffer = 4 * GIB,
  refuses = false,
} = {}) {
  const device = { destroy: vi.fn() };
  const adapter = {
    info: older ? {} : { isFallbackAdapter: fallback },
    ...(older && { isFallbackAdapter: fallback }),
    features: new Set(['timestamp-query', 'float32-filterable']),
    limits: { maxStorageBufferBindingSize: binding, maxBufferSize: buffer },
    requestDevice: vi.fn(async () => {
      if (refuses) throw new Error('refused');
      return device;
    }),
  };
  return { adapter, device };
}

function withGPU(requestAdapter: () => Promise<unknown>) {
  const gpu = { requestAdapter: vi.fn(requestAdapter) };
  vi.stubGlobal('navigator', { gpu });
  return gpu;
}

const host = () => document.createElement('div');
const unheard = () => {};

afterEach(() => {
  vi.unstubAllGlobals();
  h.gpu.fails = false;
  h.gpu.made = [];
  h.logError.mockClear();
});

describe('createCircuitView', () => {
  it('draws with WebGL 2 at once in a browser without WebGPU', () => {
    vi.stubGlobal('navigator', {});
    const into = host();
    const made = createCircuitView(into, 'auto', unheard);
    expect(made).not.toBeInstanceOf(Promise);
    expect(made).toMatchObject({ tier: 'webgl', reason: 'no WebGPU in this browser' });
    expect((made as unknown as { view: InstanceType<typeof h.FakeViewer> }).view.host).toBe(into);
  });

  it('draws with WebGL 2 at once where the debug tools ask for it, asking nothing of WebGPU', () => {
    const gpu = withGPU(async () => adapterOf().adapter);
    expect(createCircuitView(host(), 'webgl', unheard)).toMatchObject({
      tier: 'webgl',
      reason: 'chosen in the debug tools',
    });
    expect(gpu.requestAdapter).not.toHaveBeenCalled();
  });

  it.each([
    ['no adapter', async () => null, 'no graphics adapter for WebGPU'],
    [
      'an adapter that cannot be had',
      async () => {
        throw new Error('blocked');
      },
      'no graphics adapter for WebGPU',
    ],
    ['a software adapter', async () => adapterOf({ fallback: true }).adapter, 'a software adapter'],
    [
      'a software adapter, flagged as before Chrome 130',
      async () => adapterOf({ fallback: true, older: true }).adapter,
      'a software adapter',
    ],
    [
      'bindings under 512 MiB',
      async () => adapterOf({ binding: 256 * 2 ** 20 }).adapter,
      'buffers under 512 MiB',
    ],
    [
      'buffers under 512 MiB',
      async () => adapterOf({ buffer: 128 * 2 ** 20 }).adapter,
      'buffers under 512 MiB',
    ],
    [
      'a device refused',
      async () => adapterOf({ refuses: true }).adapter,
      'the device was refused',
    ],
  ])('falls back to WebGL 2 on %s, saying why', async (_case, requestAdapter, reason) => {
    withGPU(requestAdapter);
    await expect(createCircuitView(host(), 'auto', unheard)).resolves.toMatchObject({
      tier: 'webgl',
      reason,
    });
  });

  it('asks the high-performance adapter for a device with all its features and its buffers up to 2 GiB', async () => {
    const { adapter, device } = adapterOf({ binding: 4 * GIB, buffer: 1.5 * GIB });
    const gpu = withGPU(async () => adapter);
    const into = host();

    const made = await createCircuitView(into, 'auto', unheard);

    expect(gpu.requestAdapter).toHaveBeenCalledExactlyOnceWith({
      powerPreference: 'high-performance',
    });
    expect(adapter.requestDevice).toHaveBeenCalledExactlyOnceWith({
      requiredFeatures: ['timestamp-query', 'float32-filterable'],
      requiredLimits: { maxStorageBufferBindingSize: 2 * GIB, maxBufferSize: 1.5 * GIB },
    });
    expect(made).toMatchObject({ tier: 'webgpu', reason: null });
    expect(h.gpu.made).toHaveLength(1);
    expect(h.gpu.made[0]).toMatchObject({ host: into, device });
    expect(device.destroy).not.toHaveBeenCalled();
  });

  it('falls back to WebGL 2 where the WebGPU engine cannot start, letting the device go', async () => {
    const { adapter, device } = adapterOf();
    withGPU(async () => adapter);
    h.gpu.fails = true;
    await expect(createCircuitView(host(), 'auto', unheard)).resolves.toMatchObject({
      tier: 'webgl',
      reason: 'WebGPU could not start',
    });
    expect(device.destroy).toHaveBeenCalledTimes(1);
    expect(h.logError).toHaveBeenCalledTimes(1);
  });

  // Last: the page draws with WebGL 2 from then on.
  it('tells of a lost device, and draws every view after it with WebGL 2', async () => {
    const { adapter } = adapterOf();
    const gpu = withGPU(async () => adapter);
    const onLost = vi.fn();
    await createCircuitView(host(), 'auto', onLost);

    h.gpu.made[0].onLost();

    expect(onLost).toHaveBeenCalledTimes(1);
    expect(createCircuitView(host(), 'auto', unheard)).toMatchObject({
      tier: 'webgl',
      reason: 'the graphics were reset',
    });
    expect(gpu.requestAdapter).toHaveBeenCalledTimes(1);
  });
});
