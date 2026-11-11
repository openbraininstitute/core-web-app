/**
 * The triangles as a binary STL: an 80-byte header, their count, then for each its unit normal, its three corners and
 * two spare bytes. No colours: STL has none that every reader takes.
 */
export function encodeStl(positions: Float32Array, indices: Uint32Array): Uint8Array<ArrayBuffer> {
  const count = indices.length / 3;
  const buffer = new ArrayBuffer(84 + 50 * count);
  const view = new DataView(buffer);
  view.setUint32(80, count, true);
  const p = positions;
  for (let t = 0, o = 84; t < count; t++, o += 50) {
    const a = 3 * indices[3 * t],
      b = 3 * indices[3 * t + 1],
      c = 3 * indices[3 * t + 2];
    const ux = p[b] - p[a],
      uy = p[b + 1] - p[a + 1],
      uz = p[b + 2] - p[a + 2];
    const vx = p[c] - p[a],
      vy = p[c + 1] - p[a + 1],
      vz = p[c + 2] - p[a + 2];
    const nx = uy * vz - uz * vy,
      ny = uz * vx - ux * vz,
      nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz) || 1;
    view.setFloat32(o, nx / length, true);
    view.setFloat32(o + 4, ny / length, true);
    view.setFloat32(o + 8, nz / length, true);
    for (const [k, v] of [a, b, c].entries()) {
      view.setFloat32(o + 12 + 12 * k, p[v], true);
      view.setFloat32(o + 16 + 12 * k, p[v + 1], true);
      view.setFloat32(o + 20 + 12 * k, p[v + 2], true);
    }
  }
  return new Uint8Array(buffer);
}
