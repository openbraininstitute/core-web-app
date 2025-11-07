import { ArrayNumber3, TgdCamera, TgdCameraPerspective } from '@tolokoban/tgd';

interface BoundingBox {
  min: ArrayNumber3;
  max: ArrayNumber3;
  center: ArrayNumber3;
}

export function makeCamera({
  bbox,
  bboxSoma,
  bboxDendrites,
}: {
  bbox: BoundingBox;
  bboxSoma: BoundingBox;
  bboxDendrites: BoundingBox;
}) {
  console.log('🚀 [camera] bboxAxon =', bboxSoma); // @FIXME: Remove this line written on 2025-11-07 at 10:48
  const camera = new TgdCameraPerspective({
    transfo: {
      distance: 5,
      position: bbox.center,
    },
    near: 1,
  });
  const distanceMax = computeDistance(camera, bbox, 1.1);
  const distance = computeDistance(camera, bboxDendrites, 1.1);
  const distanceMin = computeDistance(camera, bboxSoma, 3);
  const zoomMin = Math.min(0.5, distance / distanceMax);
  const zoomMax = Math.min(1000, distance / distanceMin);
  camera.transfo.distance = distance;
  return { camera, zoomMin, zoomMax };
}

function computeDistance(camera: TgdCamera, bbox: BoundingBox, scale: number) {
  camera.fitSpaceAtTarget(
    2 *
      scale *
      Math.max(1, Math.abs(bbox.center[0] - bbox.min[0]), Math.abs(bbox.center[0] - bbox.max[0])),
    2 *
      scale *
      Math.max(1, Math.abs(bbox.center[1] - bbox.min[1]), Math.abs(bbox.center[1] - bbox.max[1]))
  );
  return camera.transfo.distance;
}
