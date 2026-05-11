import type { SpikePopulation } from '@/features/spike-viewer/spike-trace';

const VERTEX_SHADER = `#version 300 es
layout(location = 0) in float a_x;
layout(location = 1) in float a_y;
uniform vec4 u_bounds; // xMin, yMin, xMax, yMax
uniform mediump float u_pointSize;

void main() {
  float x = 2.0 * (a_x - u_bounds.x) / (u_bounds.z - u_bounds.x) - 1.0;
  float y = 2.0 * (a_y - u_bounds.y) / (u_bounds.w - u_bounds.y) - 1.0;
  gl_Position = vec4(x, y, 0.0, 1.0);
  gl_PointSize = u_pointSize;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
uniform vec4 u_color;
uniform float u_pointSize;
out vec4 fragColor;

void main() {
  // Vertical tick: solid core with ~1 px outer feather so subpixel
  // jitter shows as opacity falloff at the edge instead of a ±1 px
  // size step. Keeping the feather *outside* the core preserves a
  // fully opaque body so dense overlapping ticks read as solid colour
  // rather than accumulating a translucent haze.
  float feather = 1.0 / max(u_pointSize, 1.0);
  float dx = abs(gl_PointCoord.x - 0.5);
  float dy = abs(gl_PointCoord.y - 0.5);
  float alphaX = 1.0 - smoothstep(0.2, 0.2 + feather, dx);
  float alphaY = 1.0 - smoothstep(0.5 - feather, 0.5, dy);
  float alpha = alphaX * alphaY;
  if (alpha <= 0.001) discard;
  fragColor = vec4(u_color.rgb, u_color.a * alpha);
}`;

type PopulationBuffer = {
  name: string;
  color: [number, number, number, number];
  count: number;
  vao: WebGLVertexArrayObject;
  xBuffer: WebGLBuffer;
  yBuffer: WebGLBuffer;
  visible: boolean;
};

function hexToGLColor(hex: string): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b, 1.0];
}

function glRequire<T>(value: T | null, name: string): T {
  if (value === null) throw new Error(`WebGL resource creation failed: ${name}`);
  return value;
}

export class WebGLPoints {
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private program!: WebGLProgram;
  private uBounds!: WebGLUniformLocation;
  private uColor!: WebGLUniformLocation;
  private uPointSize!: WebGLUniformLocation;
  private populations: PopulationBuffer[] = [];
  private lastData: { populations: SpikePopulation[]; colors: string[] } | null = null;
  private contextLost = false;

  onRestored: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
    });
    if (!gl) throw new Error('WebGL2 not supported');
    this.gl = gl;

    this.initGL();

    canvas.addEventListener('webglcontextlost', this.handleContextLost);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  setData(populations: SpikePopulation[], colors: string[]) {
    this.lastData = { populations, colors };
    this.initBuffers(populations, colors);
  }

  draw(bounds: { xMin: number; yMin: number; xMax: number; yMax: number }, pointSize: number) {
    if (this.contextLost) return;
    const { gl } = this;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API, not a React hook
    gl.useProgram(this.program);
    gl.uniform4f(this.uBounds, bounds.xMin, bounds.yMin, bounds.xMax, bounds.yMax);
    gl.uniform1f(this.uPointSize, Math.round(pointSize * (window.devicePixelRatio || 1)));

    for (const pop of this.populations) {
      if (!pop.visible || pop.count === 0) continue;
      gl.uniform4fv(this.uColor, pop.color);
      gl.bindVertexArray(pop.vao);
      gl.drawArrays(gl.POINTS, 0, pop.count);
    }

    gl.bindVertexArray(null);
  }

  setVisibility(name: string, visible: boolean) {
    const pop = this.populations.find((p) => p.name === name);
    if (pop) pop.visible = visible;
  }

  resize(width: number, height: number) {
    if (!this.contextLost) this.gl.viewport(0, 0, width, height);
  }

  destroy() {
    this.cleanup();
    if (!this.contextLost) this.gl.deleteProgram(this.program);
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost);
    this.canvas.removeEventListener('webglcontextrestored', this.handleContextRestored);
    this.lastData = null;
  }

  private initGL() {
    const { gl } = this;
    this.program = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);
    this.uBounds = glRequire(gl.getUniformLocation(this.program, 'u_bounds'), 'u_bounds');
    this.uColor = glRequire(gl.getUniformLocation(this.program, 'u_color'), 'u_color');
    this.uPointSize = glRequire(gl.getUniformLocation(this.program, 'u_pointSize'), 'u_pointSize');
    gl.enable(gl.BLEND);
    // Separate blend for color vs alpha: standard "over" for colour, but
    // accumulate destination alpha toward 1.0 so the canvas stays opaque
    // in dense regions. Without this, overlapping feathered edges keep
    // dst.a < 1 and the browser composites pale blue over the white page.
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }

  private initBuffers(populations: SpikePopulation[], colors: string[]) {
    this.cleanup();
    const { gl } = this;

    for (let i = 0; i < populations.length; i++) {
      const pop = populations[i];
      const color = hexToGLColor(colors[i % colors.length]);

      const vao = glRequire(gl.createVertexArray(), 'VAO');
      gl.bindVertexArray(vao);

      // Timestamps → attribute 0 (x)
      const xBuffer = glRequire(gl.createBuffer(), 'xBuffer');
      gl.bindBuffer(gl.ARRAY_BUFFER, xBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, pop.timestamps, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0);

      // Node IDs → attribute 1 (y)
      const yBuffer = glRequire(gl.createBuffer(), 'yBuffer');
      gl.bindBuffer(gl.ARRAY_BUFFER, yBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, pop.nodeIds, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 1, gl.FLOAT, false, 0, 0);

      gl.bindVertexArray(null);

      this.populations.push({
        name: pop.name,
        color,
        count: pop.timestamps.length,
        vao,
        xBuffer,
        yBuffer,
        visible: true,
      });
    }
  }

  private readonly handleContextLost = (e: Event) => {
    e.preventDefault();
    this.contextLost = true;
  };

  private readonly handleContextRestored = () => {
    this.contextLost = false;
    this.initGL();
    if (this.lastData) this.initBuffers(this.lastData.populations, this.lastData.colors);
    this.onRestored?.();
  };

  private createProgram(vsSrc: string, fsSrc: string): WebGLProgram {
    const { gl } = this;
    const vs = this.compileShader(gl.VERTEX_SHADER, vsSrc);
    const fs = this.compileShader(gl.FRAGMENT_SHADER, fsSrc);
    const program = glRequire(gl.createProgram(), 'program');
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Shader link failed: ${log}`);
    }
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return program;
  }

  private compileShader(type: number, src: string): WebGLShader {
    const { gl } = this;
    const shader = glRequire(gl.createShader(type), 'shader');
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compile failed: ${log}`);
    }
    return shader;
  }

  private cleanup() {
    if (this.contextLost) {
      this.populations = [];
      return;
    }
    const { gl } = this;
    for (const pop of this.populations) {
      gl.deleteVertexArray(pop.vao);
      gl.deleteBuffer(pop.xBuffer);
      gl.deleteBuffer(pop.yBuffer);
    }
    this.populations = [];
  }
}
