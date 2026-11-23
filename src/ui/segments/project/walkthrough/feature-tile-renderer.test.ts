import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createFeatureTileRenderer } from './feature-tile-renderer';

let host: HTMLDivElement;
let canvas: HTMLCanvasElement;
let frames: Float32Array[];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['performance', 'requestAnimationFrame', 'cancelAnimationFrame'] });
  host = document.createElement('div');
  canvas = document.createElement('canvas');
  host.append(canvas);
  document.body.append(host);
  frames = [];
  const gl = {
    VERTEX_SHADER: 1,
    FRAGMENT_SHADER: 2,
    getShaderParameter: () => true,
    getProgramParameter: () => true,
    createShader: () => ({}),
    createProgram: () => ({}),
    createVertexArray: () => ({}),
    createBuffer: () => ({}),
    createTexture: () => ({}),
    getUniformLocation: () => ({}),
    getAttribLocation: () => 1,
    getAttachedShaders: () => [],
    bufferData: (_target: number, data: Float32Array) => {
      if (data.length % 13 === 0) frames.push(data.slice());
    },
  };
  for (const name of [
    'shaderSource',
    'compileShader',
    'attachShader',
    'linkProgram',
    'useProgram',
    'uniform2f',
    'uniform3f',
    'uniform4f',
    'uniform1i',
    'drawArrays',
    'bindTexture',
    'texImage2D',
    'texParameteri',
    'activeTexture',
    'pixelStorei',
    'deleteTexture',
    'uniform1f',
    'bindVertexArray',
    'bindBuffer',
    'enableVertexAttribArray',
    'vertexAttribPointer',
    'vertexAttribDivisor',
    'disable',
    'enable',
    'blendFunc',
    'viewport',
    'clearColor',
    'clear',
    'drawArraysInstanced',
    'deleteBuffer',
    'deleteVertexArray',
    'deleteShader',
    'deleteProgram',
  ]) {
    Object.assign(gl, { [name]: vi.fn() });
  }
  vi.spyOn(canvas, 'getContext').mockReturnValue(gl as unknown as WebGL2RenderingContext);
});
afterEach(() => {
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function start(reduced = false) {
  const renderer = createFeatureTileRenderer(canvas, host, {
    frameRect: { x: 792, y: 209, w: 1040, h: 585 },
    reduced,
  });
  renderer.setSource(() => null);
  renderer.setVisible(true);
  vi.advanceTimersByTime(32);
  frames.length = 0;
  return renderer;
}
it('sinks the old video tiles to white and raises the next set, then settles', () => {
  const renderer = start();
  renderer.setSource(() => null);
  vi.advanceTimersByTime(800);
  expect(
    frames.some((frame) => frame.some((value, i) => i % 13 === 12 && value > 0 && value < 1))
  ).toBe(true);
  vi.advanceTimersByTime(1500);
  expect(frames.at(-1)?.every((value, i) => i % 13 !== 12 || value === 0)).toBe(true);
  expect(canvas.dataset.featurePhase).toBe('playing');
  renderer.dispose();
});
it('changes video textures without the wave for reduced motion and releases resources', () => {
  const renderer = start(true);
  renderer.setSource(() => null);
  vi.advanceTimersByTime(800);
  expect(frames.every((frame) => frame.every((value, i) => i % 13 !== 12 || value === 0))).toBe(
    true
  );
  renderer.dispose();
  const count = frames.length;
  host.dispatchEvent(new MouseEvent('pointermove', { clientX: 900, clientY: 300 }));
  vi.advanceTimersByTime(1000);
  expect(frames.length).toBe(count);
});

it('sinks the tiles in a wave, not all at once', () => {
  const renderer = start();
  renderer.setSource(() => null);
  vi.advanceTimersByTime(400);
  expect(canvas.dataset.featurePhase).toBe('out');
  // a moment into the fall, the video tiles are at different stages of turning white
  const whites = (frames.at(-1) || []).filter(
    (_value, i) => i % 13 === 12 && (frames.at(-1)?.[i - 5] ?? -1) >= 0
  );
  expect(new Set(whites).size).toBeGreaterThan(1);
  renderer.dispose();
});
it('holds the new tiles on the floor while the next video decodes, then raises them', () => {
  const renderer = start();
  let ready = false;
  renderer.setSource(() => (ready ? { image: canvas, stamp: 'ready' } : null), { empty: false });
  vi.advanceTimersByTime(1200);
  expect(canvas.dataset.featurePhase).toBe('white');
  ready = true;
  vi.advanceTimersByTime(50);
  expect(canvas.dataset.featurePhase).toBe('in');
  vi.advanceTimersByTime(2000);
  expect(canvas.dataset.featurePhase).toBe('playing');
  renderer.dispose();
});
it('starts a change asked for during another once that one is done', () => {
  const renderer = start();
  renderer.setSource(() => null);
  vi.advanceTimersByTime(300);
  renderer.setSource(() => null);
  vi.advanceTimersByTime(1700);
  expect(canvas.dataset.featurePhase).not.toBe('playing');
  vi.advanceTimersByTime(2000);
  expect(canvas.dataset.featurePhase).toBe('playing');
  renderer.dispose();
});
