import {
  TgdCameraPerspective,
  TgdControllerCameraOrbit,
  TgdQuat,
  TgdVec3,
  tgdActionCreateCameraInterpolation,
  tgdCalcDegToRad,
} from '@tolokoban/tgd';

import { config } from '@/config';

import type { TgdCamera, TgdCameraState, TgdContext } from '@tolokoban/tgd';
import type GenericEvent from '@/util/generic-event';

interface CameraPreset {
  position: [number, number, number];
  distance: number;
  near: number;
  far: number;
}

const FIT_DISTANCE_MULTIPLIER = 1.7;
const MIN_FIT_DISTANCE = 450;
const MIN_NEAR_PLANE = 0.1;
const MIN_FAR_PLANE = 10000;

const MOUSE_PRESET: CameraPreset = {
  position: [6714.025177001953, 3849.1394271850586, 5688.234390258789],
  distance: 20000,
  near: 1,
  far: 80000,
};

function getPresetForAtlas(atlasId: string): CameraPreset {
  if (atlasId === config.MOUSE_ATLAS__ID) {
    return MOUSE_PRESET;
  }
  // for non-mouse atlases, return a neutral default that will be
  // overridden by fitCameraToBounds once the first mesh loads.
  return {
    position: [0, 0, 0],
    distance: 200,
    near: 0.01,
    far: 100000,
  };
}

/**
 * compute a camera preset from the GLTF accessor min/max bounding box.
 * `min` and `max` are vec3 arrays from the POSITION accessor.
 */
export function computePresetFromBounds(min: number[], max: number[]): CameraPreset {
  const cx = (min[0] + max[0]) / 2;
  const cy = (min[1] + max[1]) / 2;
  const cz = (min[2] + max[2]) / 2;
  const dx = max[0] - min[0];
  const dy = max[1] - min[1];
  const dz = max[2] - min[2];
  const diagonal = Math.sqrt(dx * dx + dy * dy + dz * dz);
  // Keep non-mouse atlases readable by avoiding too-tight auto-fit.
  const distance = Math.max(diagonal * FIT_DISTANCE_MULTIPLIER, MIN_FIT_DISTANCE);
  return {
    position: [cx, cy, cz],
    distance,
    near: Math.max(distance * 0.001, MIN_NEAR_PLANE),
    far: Math.max(distance * 12, MIN_FAR_PLANE),
  };
}

export interface CameraController {
  resetCamera: () => void;
  fitToBounds: (min: number[], max: number[]) => void;
}

export function setCamera(
  context: TgdContext,
  eventChange: GenericEvent<TgdCamera>,
  atlasId: string
): CameraController {
  const preset = getPresetForAtlas(atlasId);
  let restTransformation: Partial<TgdCameraState> = {
    position: new TgdVec3(preset.position),
    distance: preset.distance,
    orientation: TgdQuat.fromFace('-X-Y+Z'),
  };
  context.camera = new TgdCameraPerspective({
    near: preset.near,
    far: preset.far,
    fovy: tgdCalcDegToRad(55),
    transfo: { ...restTransformation },
  });
  const controller = new TgdControllerCameraOrbit(context, {
    inertiaOrbit: 500,
    speedZoom: 0.9,
    minZoom: 0.7,
    maxZoom: 3,
  });
  controller.eventChange.addListener((camera) => eventChange.dispatch(camera));

  const resetCamera = () => {
    context.animSchedule({
      action: tgdActionCreateCameraInterpolation(context.camera, {
        ...restTransformation,
      }),
      duration: 0.5,
      onEnd: () => {
        controller.resetZoom();
      },
    });
  };

  const fitToBounds = (min: number[], max: number[]) => {
    const computed = computePresetFromBounds(min, max);
    restTransformation = {
      position: new TgdVec3(computed.position),
      distance: computed.distance,
      orientation: TgdQuat.fromFace('-X-Y+Z'),
    };
    context.camera = new TgdCameraPerspective({
      near: computed.near,
      far: computed.far,
      fovy: tgdCalcDegToRad(55),
      transfo: { ...restTransformation },
    });
    context.paint();
  };

  return { resetCamera, fitToBounds };
}
