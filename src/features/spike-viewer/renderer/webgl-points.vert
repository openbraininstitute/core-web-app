#version 300 es
layout(location = 0) in float a_x;
layout(location = 1) in float a_y;
uniform vec4 u_bounds; // xMin, yMin, xMax, yMax
uniform mediump float u_pointSize;

void main() {
  float x = 2.0 * (a_x - u_bounds.x) / (u_bounds.z - u_bounds.x) - 1.0;
  float y = 2.0 * (a_y - u_bounds.y) / (u_bounds.w - u_bounds.y) - 1.0;
  gl_Position = vec4(x, y, 0.0, 1.0);
  gl_PointSize = u_pointSize;
}
