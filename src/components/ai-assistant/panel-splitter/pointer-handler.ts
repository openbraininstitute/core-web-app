import React from 'react';
import clamp from 'lodash/clamp';

import GenericEvent from '@/util/generic-event';

export function usePointerHandler() {
  const ref = React.useRef<PointerHandler | null>(null);
  if (!ref.current) ref.current = new PointerHandler();
  return ref.current;
}

/**
 * Deals with the horizontal panning that will increase/decrease AI-Assistant panel width.
 */
class PointerHandler {
  private touching = false;

  private touchingX = 0;

  private touchingPanelWidth = 0;

  public panelWidth: number = 25;

  public get props() {
    return {
      onPointerDown: this.handlePointerDown,
      onPointerMove: this.handlePointerMove,
      onPointerUp: this.handlePointerUp,
      onPointerCancel: this.handlePointerCancel,
    };
  }

  public readonly eventPanelWidthChange = new GenericEvent<number>();

  public readonly handlePointerDown = (evt: React.PointerEvent<HTMLDivElement>) => {
    const div = this.elem(evt);
    div.setPointerCapture(evt.pointerId);
    this.touching = true;
    this.touchingX = evt.clientX;
    this.touchingPanelWidth = this.panelWidth;
  };

  public readonly handlePointerMove = (evt: React.PointerEvent<HTMLDivElement>) => {
    if (!this.touching) return;

    const shift = (100 * (evt.clientX - this.touchingX)) / window.innerWidth;
    this.panelWidth = clamp(this.touchingPanelWidth - shift, 25, 100);
    if (this.panelWidth > 80 && shift < 0) {
      this.panelWidth = 100;
    }
    this.eventPanelWidthChange.dispatch(this.panelWidth);
  };

  public readonly handlePointerUp = (evt: React.PointerEvent<HTMLDivElement>) => {
    const div = this.elem(evt);
    div.releasePointerCapture(evt.pointerId);
    this.touching = false;
  };

  public readonly handlePointerCancel = (evt: React.PointerEvent<HTMLDivElement>) => {
    const div = this.elem(evt);
    div.releasePointerCapture(evt.pointerId);
    this.touching = false;
  };

  private elem(evt: React.PointerEvent<HTMLDivElement>): HTMLDivElement {
    const element = evt.target;
    if (element instanceof HTMLDivElement) return element;

    throw new Error('The element to resize the AI Assistant panel must be a DIV!');
  }
}
