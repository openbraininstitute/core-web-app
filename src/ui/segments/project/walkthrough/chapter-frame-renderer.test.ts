import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import { createChapterFrameRenderer } from './chapter-frame-renderer';

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
    getUniformLocation: () => ({}),
    getAttribLocation: () => 1,
    getAttachedShaders: () => [],
    bufferData: (_target: number, data: Float32Array) => {
      if (data.length % 9 === 0) frames.push(data.slice());
    },
  };
  for (const name of [
    'shaderSource',
    'compileShader',
    'attachShader',
    'linkProgram',
    'useProgram',
    'uniform2f',
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
  return createChapterFrameRenderer(canvas, host, {
    width: 960,
    height: 540,
    video: { x: 400, y: 120, w: 480, h: 270 },
    exclusions: [],
    reduced,
  });
}

it('sends scattered 3D tile turns to the GPU on scroll without moving the field', () => {
  const renderer = start();
  renderer.setVisible(true);
  frames.length = 0;
  host.dispatchEvent(new Event('scroll'));
  vi.advanceTimersByTime(600);
  const hasTurn = frames.some((frame) =>
    frame.some((value, index) => index % 9 === 8 && value > 0 && value < 1)
  );
  expect(hasTurn).toBe(true);
  expect(canvas.width).toBe(960);
  expect(canvas.height).toBe(540);
  renderer.dispose();
});

it('keeps the tile field still for reduced motion', () => {
  const renderer = start(true);
  renderer.setVisible(true);
  frames.length = 0;
  host.dispatchEvent(new Event('scroll'));
  vi.advanceTimersByTime(1200);
  expect(
    frames.every((frame) => frame.every((value, index) => index % 9 !== 8 || value === 0))
  ).toBe(true);
  expect(canvas.dataset.frameScrollFlips).toBeUndefined();
  renderer.dispose();
});

it('lets the visible frame tiles lift on hover and return to the source resting height', () => {
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: 960,
    height: 540,
  } as DOMRect);
  const renderer = start();
  renderer.setVisible(true);
  frames.length = 0;
  host.dispatchEvent(new MouseEvent('pointermove', { clientX: 400, clientY: 120 }));
  vi.advanceTimersByTime(1000);
  expect(
    frames.some((frame) => frame.some((value, index) => index % 9 === 3 && value > 0.36))
  ).toBe(true);
  host.dispatchEvent(new Event('pointerleave'));
  vi.advanceTimersByTime(3000);
  const resting = frames.at(-1)!;
  expect(resting.every((value, index) => index % 9 !== 3 || value < 0.36)).toBe(true);
  renderer.dispose();
});
