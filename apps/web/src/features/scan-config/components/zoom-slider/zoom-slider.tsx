'use client';

import { useCallback } from 'react';

import { RulerSlider } from '@/ui/molecules/slider';

import { clampZoom, formatZoom, ZOOM_MAX, ZOOM_MIN } from './scale';

import type { ViewerTheme } from '../color-by/contrast';

/** Used when the viewer is not in adaptive mode; matches the chrome's own default. */
const DEFAULT_COLOR = 'rgba(255,255,255,0.92)';

/**
 * The ruler is walked in doublings, not in zoom units.
 *
 * Zoom is a multiplier, so a linear ruler would spend most of its length above 10x and
 * leave the useful range around 1x in a few pixels. One step is a quarter of a doubling,
 * which puts a labelled tick on every power of two.
 */
const STEPS_PER_DOUBLING = 4;
const MIN_STOP = Math.log2(ZOOM_MIN) * STEPS_PER_DOUBLING;
const MAX_STOP = Math.log2(ZOOM_MAX) * STEPS_PER_DOUBLING;

/** Pixels between two steps, chosen so the ruler stands about as tall as the scalebar. */
const GAP = 9;

/**
 * The window the ruler scrolls inside, in pixels.
 *
 * Stated rather than inherited: the ruler sizes itself to its container, and the chrome
 * places it in a box that has no height of its own.
 */
const HEIGHT = 200;
/**
 * Labels, ticks, then the needle and the reading beside it — the widget is as wide as that
 * row and no wider, so the number stays next to the needle.
 */
const WIDTH = 94;

const stopToZoom = (stop: number) => 2 ** (stop / STEPS_PER_DOUBLING);
const zoomToStop = (zoom: number) => Math.log2(clampZoom(zoom)) * STEPS_PER_DOUBLING;

interface IZoomSliderProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  /** Background-derived theme, or null for the fixed default. */
  theme?: ViewerTheme | null;
  className?: string;
}

/**
 * Zoom control: a ruler that scrolls under a fixed needle.
 *
 * Reads the camera rather than owning the zoom, so scrolling on the canvas moves the ruler
 * too and the two never disagree.
 */
export function ZoomSlider({ zoom, onZoomChange, theme, className }: IZoomSliderProps) {
  const handleChange = useCallback(
    (stop: number) => onZoomChange(stopToZoom(stop)),
    [onZoomChange]
  );

  return (
    <RulerSlider
      testId="viewer-zoom-slider"
      className={className}
      // The ruler paints in `currentColor`, so this is what makes it read on either canvas.
      style={{ height: HEIGHT, width: WIDTH, color: theme?.foreground ?? DEFAULT_COLOR }}
      orientation="vertical"
      aria-label="Zoom"
      min={MIN_STOP}
      max={MAX_STOP}
      step={1}
      gap={GAP}
      majorEvery={STEPS_PER_DOUBLING}
      value={zoomToStop(zoom)}
      onValueChange={handleChange}
      formatTick={(stop) => formatZoom(stopToZoom(stop))}
      formatValue={(stop) => formatZoom(stopToZoom(stop))}
      // The canvas is the thing worth looking at; the reading is only useful while moving.
      showValue="active"
      formatValueText={(stop) => formatZoom(stopToZoom(stop))}
    />
  );
}

export default ZoomSlider;
