import {
  type TgdCamera,
  TgdCameraPerspective,
  type TgdCameraState,
  type TgdContext,
  TgdControllerCameraOrbit,
  TgdQuat,
  TgdVec3,
  tgdActionCreateCameraInterpolation,
  tgdCalcDegToRad,
} from '@tolokoban/tgd';

import type GenericEvent from '@/util/generic-event';

export function setCamera(context: TgdContext, eventChange: GenericEvent<TgdCamera>) {
  const restTransfo: Partial<TgdCameraState> = {
    position: new TgdVec3([6714.025177001953, 3849.1394271850586, 5688.234390258789]),
    distance: 20000,
    orientation: TgdQuat.fromFace('-X-Y+Z'),
  };
  context.camera = new TgdCameraPerspective({
    near: 1,
    far: 80000,
    fovy: tgdCalcDegToRad(55),
    transfo: { ...restTransfo },
  });
  const controller = new TgdControllerCameraOrbit(context, {
    inertiaOrbit: 500,
    speedZoom: 0.9,
    minZoom: 0.7,
    maxZoom: 3,
  });
  controller.eventChange.addListener((camera) => eventChange.dispatch(camera));
  return () => {
    context.animSchedule({
      action: tgdActionCreateCameraInterpolation(context.camera, {
        ...restTransfo,
      }),
      duration: 0.5,
      onEnd: () => {
        controller.resetZoom();
      },
    });
  };
}
