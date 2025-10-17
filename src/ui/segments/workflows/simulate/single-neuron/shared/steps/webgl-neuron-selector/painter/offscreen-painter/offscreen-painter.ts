/* eslint-disable no-bitwise */
import {
  TgdContext,
  TgdPainterClear,
  TgdPainterSegments,
  TgdPainterState,
  webglPresetDepth,
} from '@tolokoban/tgd';
import { Structure } from '../structure';
import { makeSegments } from '../segments';
import { MaterialIndex } from './material-index';

export class OffscreenPainter {
  private readonly offscreenCanvas = new OffscreenCanvas(1, 1);

  private readonly context: TgdContext;

  constructor(
    private readonly onscreenContext: TgdContext,
    private readonly structure: Structure
  ) {
    onscreenContext.eventPaint.addListener(this.paint);
    const context = new TgdContext(this.offscreenCanvas, {
      preserveDrawingBuffer: true,
      antialias: false,
      alpha: false,
    });
    context.camera = onscreenContext.camera;
    this.context = context;
    const segments = makeSegments(structure);
    context.add(
      new TgdPainterClear(context, { color: [0, 0, 0, 1], depth: 1 }),
      new TgdPainterState(context, {
        depth: webglPresetDepth.lessOrEqual,
        children: [
          new TgdPainterSegments(context, {
            minRadius: 3,
            makeDataset: segments.makeDataset,
            material: new MaterialIndex(),
          }),
        ],
      })
    );
    this.paint();
  }

  getItemAt(xScreen: number, yScreen: number) {
    const { structure, context } = this;
    const [R, G, B] = context.readPixel(xScreen, yScreen);
    const value = (R + (G << 8) + (B << 16)) / 0xffffff;
    const index = Math.floor((structure.length + 2) * value) - 1;
    if (index < 0 || index > structure.length - 1) return null;

    return structure.get(index);
  }

  private readonly paint = () => {
    const { canvas } = this.onscreenContext;
    const w = Math.ceil(canvas.width / 4);
    const h = Math.ceil(canvas.height / 4);
    this.offscreenCanvas.width = w;
    this.offscreenCanvas.height = h;
    this.context.paint();
  };

  delete() {
    this.onscreenContext.eventPaint.removeListener(this.paint);
    this.context.delete();
  }
}
