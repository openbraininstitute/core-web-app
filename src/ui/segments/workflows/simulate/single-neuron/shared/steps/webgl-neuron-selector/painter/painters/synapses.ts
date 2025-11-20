import {
  TgdContext,
  TgdPainterPointsCloud,
  TgdPainterGroup,
  TgdTexture2D,
  tgdCanvasCreateFill,
} from '@tolokoban/tgd';

export class PainterSynapses extends TgdPainterGroup {
  constructor(context: TgdContext, synapses: Array<{ color: string; data: Float32Array }>) {
    super();
    for (const { color, data: dataPoint } of synapses) {
      const cloud = new TgdPainterPointsCloud(context, {
        name: `TgdPainterPointsCloud[${color}]`,
        dataPoint,
        minSizeInPixels: 4,
        radiusMultiplier: 5,
        texture: new TgdTexture2D(context).loadBitmap(tgdCanvasCreateFill(1, 1, color)),
        mustDeleteTexture: true,
      });
      this.add(cloud);
    }
  }

  delete(): void {
    super.delete();
  }
}
