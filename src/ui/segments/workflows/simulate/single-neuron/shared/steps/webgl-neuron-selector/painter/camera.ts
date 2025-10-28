import { ArrayNumber3, TgdCameraPerspective } from '@tolokoban/tgd';

export function makeCamera(bbox: { min: ArrayNumber3; max: ArrayNumber3; center: ArrayNumber3 }) {
  const camera = new TgdCameraPerspective({
    transfo: {
      distance: 5,
      position: bbox.center,
    },
    near: 1,
  });
  camera.spaceHeightAtTarget = Math.max(
    Math.abs(bbox.center[1] - bbox.min[1]),
    Math.abs(bbox.center[1] - bbox.max[1])
  );
  camera.far = camera.spaceHeightAtTarget * 10;
  return camera;
}
