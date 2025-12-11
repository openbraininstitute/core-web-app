import React from 'react';
import { TgdContext } from '@tolokoban/tgd';

import { createTreeStructure } from './tree';

import { Morphology } from '@/services/bluenaas-single-cell/types';

class PainterDendrogram {
  private _morphology: Morphology = {};

  private context: TgdContext | null = null;

  get morphology() {
    return this._morphology;
  }

  set morphology(value: Morphology) {
    if (value === this._morphology) return;

    this._morphology = value;
    this.updateMorphology();
  }

  readonly init = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;

    const context = new TgdContext(canvas);
    this.context = context;
    this.updateMorphology();

    return () => context.delete();
  };

  private updateMorphology() {
    const { context } = this;
    if (!context) return;

    const tree = createTreeStructure(this.morphology);
    console.log('🐞 [painter@26] tree =', tree); // @FIXME: Remove this line written on 2025-12-11 at 10:17
  }
}

export function usePainterDendrogram(morphology: Morphology) {
  const ref = React.useRef<PainterDendrogram | null>(null);
  if (!ref.current) ref.current = new PainterDendrogram();
  React.useEffect(() => {
    const painter = ref.current;
    if (!painter) return;

    painter.morphology = morphology;
  }, [morphology]);
  return ref.current;
}
