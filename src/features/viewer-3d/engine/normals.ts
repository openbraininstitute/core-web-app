/** Each vertex's normal: the sum of its triangles' normals weighted by their areas, not normalised. */
export function vertexNormals(
  positions: Uint16Array | Float32Array,
  indices: Uint32Array
): Float32Array {
  const normals = new Float32Array(positions.length);
  for (let t = 0; t < indices.length; t += 3) {
    const a = 3 * indices[t],
      b = 3 * indices[t + 1],
      c = 3 * indices[t + 2];
    const abx = positions[b] - positions[a],
      aby = positions[b + 1] - positions[a + 1],
      abz = positions[b + 2] - positions[a + 2];
    const acx = positions[c] - positions[a],
      acy = positions[c + 1] - positions[a + 1],
      acz = positions[c + 2] - positions[a + 2];
    const nx = aby * acz - abz * acy,
      ny = abz * acx - abx * acz,
      nz = abx * acy - aby * acx;
    normals[a] += nx;
    normals[a + 1] += ny;
    normals[a + 2] += nz;
    normals[b] += nx;
    normals[b + 1] += ny;
    normals[b + 2] += nz;
    normals[c] += nx;
    normals[c + 1] += ny;
    normals[c + 2] += nz;
  }
  return normals;
}
