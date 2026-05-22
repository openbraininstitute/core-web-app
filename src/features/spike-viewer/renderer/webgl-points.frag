#version 300 es
precision mediump float;
uniform vec4 u_color;
uniform float u_pointSize;
out vec4 fragColor;

void main() {
  // Round marker: solid core with ~1 px outer feather so subpixel
  // jitter shows as opacity falloff at the edge instead of a ±1 px
  // size step. Keeping the feather *outside* the core preserves a
  // fully opaque body so dense overlapping dots read as solid colour
  // rather than accumulating a translucent haze.
  float feather = 1.0 / max(u_pointSize, 1.0);
  vec2 v = 2.0 * (gl_PointCoord - vec2(0.5));
  float distSq = dot(v, v);
  float inner = 1.0 - 2.0 * feather;
  float alpha = 1.0 - smoothstep(inner * inner, 1.0, distSq);
  if (alpha < 1.0 / 255.0) discard;
  fragColor = vec4(u_color.rgb, u_color.a * alpha);
}
