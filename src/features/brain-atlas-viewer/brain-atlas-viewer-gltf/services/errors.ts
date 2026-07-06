/**
 * Thrown when a brain region has no 3D mesh available in the current atlas —
 * either the region has no `brain-atlas-region` entity at all (it exists in the
 * hierarchy tree but not the atlas, e.g. non-volumetric grouping regions like
 * "grooves"), or it has an entity but no `brain_atlas_region_mesh` gltf asset.
 *
 * This is an expected, benign condition (such regions are greyed out but still
 * selectable), so the viewer suppresses the error popup for it — cf.
 * `isMeshNotAvailableError` in `../painter`. Lives in its own module so it stays
 * unmocked when tests mock `./services`, keeping `instanceof` reliable.
 */
export class RegionMeshNotAvailableError extends Error {
  constructor(
    readonly regionId: string,
    readonly atlasId: string,
    message: string
  ) {
    super(message);
    this.name = 'RegionMeshNotAvailableError';
    // tsconfig target is es2015 (SWC downlevels classes) — keep instanceof reliable.
    Object.setPrototypeOf(this, RegionMeshNotAvailableError.prototype);
  }
}
