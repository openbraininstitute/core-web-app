import type { SpikePopulation } from '@/features/spike-viewer/spike-trace';

const VERTEX_SHADER = `#version 300 es
layout(location = 0) in float a_x;
layout(location = 1) in float a_y;
uniform vec4 u_bounds; // xMin, yMin, xMax, yMax
uniform float u_pointSize;

void main() {
  float x = 2.0 * (a_x - u_bounds.x) / (u_bounds.z - u_bounds.x) - 1.0;
  float y = 2.0 * (a_y - u_bounds.y) / (u_bounds.w - u_bounds.y) - 1.0;
  gl_Position = vec4(x, y, 0.0, 1.0);
  gl_PointSize = u_pointSize;
}`;

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
uniform vec4 u_color;
out vec4 fragColor;

void main() {
  // Vertical tick mark: only draw the center strip
  float dx = abs(gl_PointCoord.x - 0.5);
  if (dx > 0.2) discard;
  fragColor = u_color;
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
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private uBounds: WebGLUniformLocation;
  private uColor: WebGLUniformLocation;
  private uPointSize: WebGLUniformLocation;
  private populations: PopulationBuffer[] = [];

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', {
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
    });
    if (!gl) throw new Error('WebGL2 not supported');
    this.gl = gl;

    this.program = this.createProgram(VERTEX_SHADER, FRAGMENT_SHADER);
    this.uBounds = glRequire(gl.getUniformLocation(this.program, 'u_bounds'), 'u_bounds');
    this.uColor = glRequire(gl.getUniformLocation(this.program, 'u_color'), 'u_color');
    this.uPointSize = glRequire(gl.getUniformLocation(this.program, 'u_pointSize'), 'u_pointSize');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  setData(populations: SpikePopulation[], colors: string[]) {
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

  draw(bounds: { xMin: number; yMin: number; xMax: number; yMax: number }, pointSize: number) {
    const { gl } = this;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL API, not a React hook
    gl.useProgram(this.program);
    gl.uniform4f(this.uBounds, bounds.xMin, bounds.yMin, bounds.xMax, bounds.yMax);
    gl.uniform1f(this.uPointSize, pointSize * (window.devicePixelRatio || 1));

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
    this.gl.viewport(0, 0, width, height);
  }

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
    const { gl } = this;
    for (const pop of this.populations) {
      gl.deleteVertexArray(pop.vao);
      gl.deleteBuffer(pop.xBuffer);
      gl.deleteBuffer(pop.yBuffer);
    }
    this.populations = [];
  }

  destroy() {
    this.cleanup();
    this.gl.deleteProgram(this.program);
  }
}
