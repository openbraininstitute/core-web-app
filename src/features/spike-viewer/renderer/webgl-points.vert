#version 300 es
layout(location = 0) in float a_x;
layout(location = 1) in float a_y;
// Per spike when its cells are coloured, else one constant for the population.
layout(location = 2) in vec4 a_color;
uniform vec4 u_bounds; // xMin, yMin, xMax, yMax
uniform mediump float u_pointSize;
out vec4 v_color;

void main() {
  float x = 2.0 * (a_x - u_bounds.x) / (u_bounds.z - u_bounds.x) - 1.0;
  // Rows run down from the top: node 0, or the first of an order, uppermost.
  float y = 1.0 - 2.0 * (a_y - u_bounds.y) / (u_bounds.w - u_bounds.y);
  gl_Position = vec4(x, y, 0.0, 1.0);
  gl_PointSize = u_pointSize;
  v_color = a_color;
}
