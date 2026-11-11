import React from 'react';

import GenericEvent from '@/util/generic-event';

import { usePanelWidth, useSetIsDragging } from '../hooks';

export function usePointerHandler() {
  const { panelWidth, setPanelWidth } = usePanelWidth();
  const setIsDragging = useSetIsDragging();
  const ref = React.useRef<PointerHandler | null>(null);
  if (!ref.current) ref.current = new PointerHandler();
  ref.current.panelWidth = panelWidth;
  ref.current.setPanelWidth = setPanelWidth;
  ref.current.setIsDragging = setIsDragging;
  return ref.current;
}

/**
 * Deals with the horizontal panning that will increase/decrease AI-Assistant panel width.
 */
class PointerHandler {
  public panelWidth: number = 0;

  public setPanelWidth = (_panelWidth: number) => {};

  public setIsDragging = (_isDragging: boolean) => {};

  private touching = false;

  private touchingX = 0;

  private touchingPanelWidth = 0;

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
    evt.preventDefault();
    const div = this.elem(evt);
    div.setPointerCapture(evt.pointerId);
    this.touching = true;
    this.touchingX = evt.clientX;
    this.touchingPanelWidth = this.panelWidth;
    this.setIsDragging(true);
  };

  public readonly handlePointerMove = (evt: React.PointerEvent<HTMLDivElement>) => {
    if (!this.touching) return;

    const shift = evt.clientX - this.touchingX;
    const newWidth = this.touchingPanelWidth - shift;
    this.setPanelWidth(newWidth);
  };

  public readonly handlePointerUp = (evt: React.PointerEvent<HTMLDivElement>) => {
    const div = this.elem(evt);
    div.releasePointerCapture(evt.pointerId);
    this.touching = false;
    this.setIsDragging(false);
  };

  public readonly handlePointerCancel = (evt: React.PointerEvent<HTMLDivElement>) => {
    const div = this.elem(evt);
    div.releasePointerCapture(evt.pointerId);
    this.touching = false;
    this.setIsDragging(false);
  };

  private elem(evt: React.PointerEvent<HTMLDivElement>): HTMLDivElement {
    const element = evt.target;
    if (element instanceof HTMLDivElement) return element;

    throw new Error('The element to resize the AI Assistant panel must be a DIV!');
  }
}
