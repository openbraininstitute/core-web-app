import {
  ArrayNumber2,
  TgdContext,
  TgdLight,
  TgdMaterialDiffuse,
  TgdPainterGroup,
  TgdPainterSegments,
  TgdPainterSegmentsData,
  TgdPainterState,
  TgdVec3,
  webglPresetBlend,
  webglPresetCull,
  webglPresetDepth,
} from '@tolokoban/tgd';

import { StructureItem, StructureItemType } from '../structure';

export class PainterHover extends TgdPainterGroup {
  constructor(
    private readonly context: TgdContext,
    item: StructureItem
  ) {
    super();
    const segments = new TgdPainterSegmentsData();
    const uv: ArrayNumber2 = [
      (StructureItemType.Selected + 0.5) / (StructureItemType.Unknown + 1),
      0,
    ];
    const radius = item.radius * 1.5;
    segments.add([...item.start, radius], [...item.end, radius], uv, uv);

    this.add(
      new TgdPainterState(context, {
        blend: webglPresetBlend.add,
        cull: webglPresetCull.back,
        depth: webglPresetDepth.always,
        children: [
          new TgdPainterSegments(context, {
            roundness: 32,
            minRadius: 2,
            makeDataset: segments.makeDataset,
            material: new TgdMaterialDiffuse({
              color: [0.8, 0.6, 0.3, 1],
              specularExponent: 1,
              specularIntensity: 0.5,
              lockLightsToCamera: true,
              light: new TgdLight({
                direction: new TgdVec3(0, 0, -1),
              }),
            }),
          }),
        ],
      })
    );
  }
}
