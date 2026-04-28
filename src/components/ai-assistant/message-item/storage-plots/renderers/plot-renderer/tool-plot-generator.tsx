/* eslint-disable react/no-array-index-key */

import { FullscreenOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';
import React from 'react';

import FullscreenDialog from '@/components/ai-assistant/message-item/fullscreen-dialog/fullscreen-dialog';
import { logError } from '@/util/logger';
import { isString } from '@/util/type-guards';
import { classNames } from '@/util/utils';

import ToolSkeleton from '../skeleton/tool-skeleton';

import type { ToolResult } from '../../types';

import styles from './tool-plot-generator.module.css';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export interface ToolPlotGeneratorProps {
  className?: string;
  result: ToolResult | null;
  data?: { content: string; type: string };
  plotRenderKey?: number | string;
  isAnimating?: boolean;
}

export default function ToolPlotGenerator({
  className,
  result,
  data: providedData,
  plotRenderKey,
  isAnimating,
}: ToolPlotGeneratorProps) {
  if (!result) return null;

  const storageKey = Array.isArray(result.storage_id) ? result.storage_id[0] : result.storage_id;

  return (
    providedData && (
      <CustomPlot
        className={className}
        key={storageKey}
        providedData={providedData}
        plotRenderKey={plotRenderKey}
        isAnimating={isAnimating}
      />
    )
  );
}

// ---------------------------------------------------------------------------
// Subplot detection & layout helpers
// ---------------------------------------------------------------------------

const TICK_TRUNCATE_THRESHOLD = 8;

/** Truncate a string to `max` characters, appending `…` if it exceeds. */
function truncateLabel(label: string, max: number = TICK_TRUNCATE_THRESHOLD): string {
  if (label.length <= max) return label;
  return `${label.slice(0, max)}...`;
}

/** Detect whether a string looks like a date / datetime value. */
const DATE_PATTERNS = [
  /^\d{4}-\d{2}-\d{2}/, // ISO 2026-01-11, 2026-01-11T00:00:00
  /^\d{2}\/\d{2}\/\d{4}/, // US 01/11/2026
  /^\d{2}-\d{2}-\d{4}/, // EU 11-01-2026
  /^\w{3}\s+\d{1,2}/, // "Jan 11", "Feb 8"
  /^\d{1,2}\s+\w{3}/, // "11 Jan", "8 Feb"
];

function looksLikeDate(value: string): boolean {
  return DATE_PATTERNS.some((re) => re.test(value));
}

/**
 * For every axis that carries categorical (string) tick values, set
 * `tickvals` / `ticktext` so the displayed labels are truncated while
 * the underlying data stays intact.
 *
 * Also handles numeric values whose string representation exceeds the
 * threshold (e.g. `15.236489737037068`).
 *
 * Skips axes whose values look like dates — Plotly handles those natively.
 * Only applied when the container is narrow (< 500px).
 */
function truncateLongTicks(
  data: Array<Record<string, unknown>>,
  layout: Record<string, unknown>
): Record<string, unknown> {
  const axisOverrides: Record<string, unknown> = {};

  // Build a map: axis key → set of unique values (strings and long-decimal numbers)
  const axisCategoryValues: Record<string, Set<string>> = {};
  // Track which axes have any string values (truly categorical)
  const axisHasStrings: Record<string, boolean> = {};

  for (const trace of data) {
    for (const dim of ['x', 'y'] as const) {
      const values = trace[dim];
      if (!Array.isArray(values)) continue;

      // Determine which axis this trace dimension maps to
      const axisRef = (trace[`${dim}axis`] as string) || dim;
      const axisKey = axisRef === dim ? `${dim}axis` : `${dim}axis${axisRef.slice(1)}`;

      if (!axisCategoryValues[axisKey]) {
        axisCategoryValues[axisKey] = new Set();
      }

      for (const v of values) {
        if (typeof v === 'string') {
          axisCategoryValues[axisKey].add(v);
          axisHasStrings[axisKey] = true;
        } else if (typeof v === 'number' && String(v).length > TICK_TRUNCATE_THRESHOLD) {
          // Numeric value with a long string representation (many decimals)
          axisCategoryValues[axisKey].add(String(v));
        }
      }
    }
  }

  // Only truncate axes that have string values (categorical axes).
  // Pure numeric axes should be left to Plotly's native formatting.
  for (const [axisKey, categories] of Object.entries(axisCategoryValues)) {
    if (!axisHasStrings[axisKey]) continue;

    const vals = [...categories];

    // Skip axes where values look like dates — let Plotly handle them
    if (vals.some((v) => looksLikeDate(v))) continue;

    const hasLong = vals.some((c) => c.length > TICK_TRUNCATE_THRESHOLD);
    if (!hasLong) continue;

    const ticktext = vals.map((v) => truncateLabel(v));
    const existing = (layout[axisKey] ?? {}) as Record<string, unknown>;

    axisOverrides[axisKey] = {
      ...existing,
      tickvals: vals,
      ticktext,
    };
  }

  return axisOverrides;
}

/** Count how many distinct axes exist (xaxis, xaxis2, xaxis3 …). */
function countAxes(layout: Record<string, unknown>): number {
  if (!layout) return 1;
  const axisKeys = Object.keys(layout).filter((k) => /^xaxis\d*$/.test(k));
  return Math.max(axisKeys.length, 1);
}

/**
 * Apply compact font / margin overrides to *every* axis in the layout.
 * The current code only touches `xaxis` and `yaxis`, which leaves
 * `xaxis2 … xaxisN` and `yaxis2 … yaxisN` untouched — the root cause
 * of the overlapping text in subplot grids.
 */
function compactAllAxes(
  layout: Record<string, unknown>,
  opts: {
    maxTitleFont: number;
    maxTickFont: number;
    standoff: number;
    hideAxisTitles: boolean;
    nticks?: number;
  }
): Record<string, unknown> {
  const patched: Record<string, unknown> = {};

  for (const key of Object.keys(layout)) {
    if (!/^[xy]axis\d*$/.test(key)) continue;

    const axis = (layout[key] ?? {}) as Record<string, unknown>;
    const titleObj = (axis.title ?? {}) as Record<string, unknown>;
    const titleFontObj = (titleObj.font ?? {}) as Record<string, unknown>;
    const tickFontObj = (axis.tickfont ?? {}) as Record<string, unknown>;

    patched[key] = {
      ...axis,
      title: opts.hideAxisTitles
        ? { ...titleObj, text: '' }
        : {
            ...titleObj,
            font: {
              ...titleFontObj,
              size: Math.min((titleFontObj.size as number) || 12, opts.maxTitleFont),
            },
            standoff: opts.standoff,
          },
      tickfont: {
        ...tickFontObj,
        size: Math.min((tickFontObj.size as number) || 12, opts.maxTickFont),
      },
      automargin: true,
      ...(opts.nticks !== undefined ? { nticks: opts.nticks } : {}),
    };
  }

  return patched;
}

/** Shrink annotation font sizes (Plotly uses annotations for subplot titles). */
function compactAnnotations(
  annotations: Array<Record<string, unknown>> | undefined,
  maxSize: number
): Array<Record<string, unknown>> | undefined {
  if (!Array.isArray(annotations)) return annotations;
  return annotations.map((a) => {
    const font = (a.font ?? {}) as Record<string, unknown>;
    return {
      ...a,
      font: {
        ...font,
        size: Math.min((font.size as number) || 16, maxSize),
      },
    };
  });
}

/**
 * Shrink colorbar labels so they don't overflow in compact views.
 * Plotly stores colorbar config on each trace (`data[i].colorbar`).
 */
function compactTraceColorbars(
  data: Array<Record<string, unknown>>,
  opts: { maxTickFont: number; thickness: number; len: number }
): Array<Record<string, unknown>> {
  return data.map((trace) => {
    if (!trace.colorbar) return trace;
    const cb = trace.colorbar as Record<string, unknown>;
    const tickfont = (cb.tickfont ?? {}) as Record<string, unknown>;
    const titleObj = (cb.title ?? {}) as Record<string, unknown>;
    const titleFont = (titleObj.font ?? {}) as Record<string, unknown>;
    return {
      ...trace,
      colorbar: {
        ...cb,
        tickfont: {
          ...tickfont,
          size: Math.min((tickfont.size as number) || 12, opts.maxTickFont),
        },
        title: {
          ...titleObj,
          font: {
            ...titleFont,
            size: Math.min((titleFont.size as number) || 12, opts.maxTickFont),
          },
        },
        thickness: Math.min((cb.thickness as number) || opts.thickness, opts.thickness),
        len: Math.min((cb.len as number) || opts.len, opts.len),
      },
    };
  });
}

// ---------------------------------------------------------------------------
// Inline layout builder
// ---------------------------------------------------------------------------

function buildInlineLayout(layout: Record<string, unknown>, subplotCount: number) {
  const isGrid = subplotCount >= 4;
  const isDenseGrid = subplotCount >= 9;

  // Font sizes scale down with subplot density
  const baseFontSize = isDenseGrid ? 6 : isGrid ? 8 : 10;
  const axisTitleFont = isDenseGrid ? 0 : isGrid ? 7 : 10; // 0 → will hide
  const axisTickFont = isDenseGrid ? 6 : isGrid ? 7 : 9;
  const annotationFont = isDenseGrid ? 7 : isGrid ? 8 : 10;
  const legendFont = isDenseGrid ? 6 : isGrid ? 7 : 9;

  const axisOverrides = compactAllAxes(layout, {
    maxTitleFont: axisTitleFont,
    maxTickFont: axisTickFont,
    standoff: isGrid ? 4 : 6,
    hideAxisTitles: isDenseGrid,
    nticks: isDenseGrid ? 4 : isGrid ? 5 : undefined,
  });

  const annotations = compactAnnotations(
    layout.annotations as Array<Record<string, unknown>> | undefined,
    annotationFont
  );

  return {
    ...layout,
    ...axisOverrides,
    title: undefined,
    autosize: true,
    width: undefined,
    height: undefined,
    margin: isGrid ? { t: 2, l: 2, r: 2, b: 2, pad: 0 } : { t: 0, l: 3, r: 3, b: 3, pad: 0 },
    modebar: { orientation: 'v' as const },
    font: {
      ...(layout.font as Record<string, unknown>),
      size: baseFontSize,
    },
    annotations,
    legend: {
      ...(layout.legend as Record<string, unknown>),
      font: {
        ...((layout.legend as Record<string, unknown>)?.font as Record<string, unknown>),
        size: legendFont,
      },
      ...(isDenseGrid ? { visible: false } : { tracegroupgap: 2, itemwidth: 20, xpad: 2, ypad: 2 }),
    },
  };
}

// ---------------------------------------------------------------------------
// Fullscreen layout builder
// ---------------------------------------------------------------------------

function buildFullscreenLayout(layout: Record<string, unknown>) {
  // Apply generous font sizes to ALL axes, not just the first pair.
  const axisOverrides: Record<string, unknown> = {};
  for (const key of Object.keys(layout)) {
    if (!/^[xy]axis\d*$/.test(key)) continue;
    const axis = (layout[key] ?? {}) as Record<string, unknown>;
    const titleObj = (axis.title ?? {}) as Record<string, unknown>;
    const titleFontObj = (titleObj.font ?? {}) as Record<string, unknown>;
    const tickFontObj = (axis.tickfont ?? {}) as Record<string, unknown>;

    axisOverrides[key] = {
      ...axis,
      title: {
        ...titleObj,
        font: {
          ...titleFontObj,
          size: Math.max((titleFontObj.size as number) || 14, 18),
        },
        standoff: 8,
      },
      tickfont: {
        ...tickFontObj,
        size: Math.max((tickFontObj.size as number) || 12, 14),
      },
    };
  }

  return {
    ...layout,
    ...axisOverrides,
    title: undefined,
    autosize: true,
    width: undefined,
    height: undefined,
    margin: layout.margin as Record<string, unknown>,
    modebar: { orientation: 'v' as const },
    font: {
      ...(layout.font as Record<string, unknown>),
      size: Math.max(((layout.font as Record<string, unknown>)?.size as number) || 12, 16),
    },
    legend: {
      ...(layout.legend as Record<string, unknown>),
      font: {
        ...((layout.legend as Record<string, unknown>)?.font as Record<string, unknown>),
        size: Math.max(
          (((layout.legend as Record<string, unknown>)?.font as Record<string, unknown>)
            ?.size as number) || 12,
          14
        ),
      },
    },
  };
}

// ---------------------------------------------------------------------------
// CustomPlot component
// ---------------------------------------------------------------------------

function CustomPlot({
  className,
  providedData,
  plotRenderKey,
  isAnimating,
}: {
  className?: string;
  providedData: { content: string; type: string };
  plotRenderKey?: number | string;
  isAnimating?: boolean;
}) {
  const { content, type } = providedData;
  const [plotReady, setPlotReady] = React.useState(false);
  const [fullscreenPlotReady, setFullscreenPlotReady] = React.useState(false);
  const refDialog = React.useRef<HTMLDialogElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [isNarrow, setIsNarrow] = React.useState(false);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIsNarrow(entry.contentRect.width < 500);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!isString(content)) return null;
  if (type !== 'json') return <b>{type}</b>;

  let props;
  try {
    props = JSON.parse(content);
  } catch (ex) {
    logError('Unable to parse JSON:', content);
    return null;
  }

  const layout = (props.layout ?? {}) as Record<string, unknown>;
  const title = (layout.title as Record<string, unknown>)?.text ?? (layout.title as string) ?? '';
  const titleFont = ((layout.title as Record<string, unknown>)?.font ?? {}) as Record<
    string,
    unknown
  >;

  const subplotCount = countAxes(layout);
  const isGrid = subplotCount >= 4;
  const isDenseGrid = subplotCount >= 9;

  const modifiedLayout = buildInlineLayout(layout, subplotCount);

  // Truncate long tick labels (> 8 chars) only when the panel is narrow (< 500px)
  const traceData = Array.isArray(props.data) ? props.data : [];
  const tickOverrides = isNarrow ? truncateLongTicks(traceData, modifiedLayout) : {};
  const finalInlineLayout = { ...modifiedLayout, ...tickOverrides };

  // Compact colorbars for inline view on dense grids
  const inlineData =
    isGrid && Array.isArray(props.data)
      ? compactTraceColorbars(props.data, {
          maxTickFont: isDenseGrid ? 7 : 9,
          thickness: isDenseGrid ? 10 : 15,
          len: isDenseGrid ? 0.6 : 0.8,
        })
      : props.data;

  const fullscreenLayout = buildFullscreenLayout(layout);

  // Use a taller aspect ratio for dense subplot grids so each cell gets more room
  const aspectRatio = isDenseGrid ? '1 / 1' : isGrid ? '4 / 3.5' : undefined;

  const handleShow = () => {
    refDialog.current?.showModal();
  };

  return (
    <>
      <div
        ref={containerRef}
        className={classNames('h-full', styles.plotContainer)}
        style={{
          ...(isAnimating ? { contain: 'strict' } : undefined),
          ...(aspectRatio ? { aspectRatio } : {}),
        }}
      >
        <button
          type="button"
          onClick={handleShow}
          className={styles.fullscreenButton}
          aria-label="View fullscreen"
        >
          <FullscreenOutlined />
        </button>
        {title && (
          <PlotTitle title={title as string} titleFont={titleFont} paddingRight="28px" compact />
        )}
        {!plotReady && <ToolSkeleton />}
        <div
          key={plotRenderKey}
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            visibility: plotReady ? 'visible' : 'hidden',
          }}
          onDoubleClick={handleShow}
        >
          <Plot
            className={classNames(className, styles.toolPlotGenerator)}
            style={{
              width: '100%',
              minWidth: '250px',
              height: '100%',
            }}
            data={inlineData}
            layout={finalInlineLayout}
            frames={props?.frames}
            config={{
              displaylogo: false,
              responsive: true,
              modeBarButtons: [['resetScale2d', 'zoom2d', 'pan2d', 'toImage']],
            }}
            useResizeHandler
            onInitialized={() => setPlotReady(true)}
            onUpdate={() => setPlotReady(true)}
            onDoubleClick={handleShow}
          />
        </div>
      </div>
      <FullscreenDialog dialogRef={refDialog}>
        {title && <PlotTitle title={title as string} titleFont={titleFont} isFullscreen />}
        <Plot
          style={{
            width: '90vw',
            height: title ? 'calc(90vh - 60px)' : '90vh',
            visibility: fullscreenPlotReady ? 'visible' : 'hidden',
          }}
          data={props.data}
          layout={fullscreenLayout}
          frames={props?.frames}
          config={{ displaylogo: false, responsive: true }}
          useResizeHandler
          onInitialized={() => setFullscreenPlotReady(true)}
          onUpdate={() => setFullscreenPlotReady(true)}
        />
      </FullscreenDialog>
    </>
  );
}

function PlotTitle({
  title,
  titleFont,
  paddingRight,
  isFullscreen,
  compact,
}: {
  title: string;
  titleFont: { size?: number; family?: string; weight?: string; color?: string };
  paddingRight?: string;
  isFullscreen?: boolean;
  compact?: boolean;
}) {
  const baseFontSize = titleFont.size || 16;
  let fontSize: number;
  if (isFullscreen) {
    fontSize = Math.max(baseFontSize, 24);
  } else if (compact) {
    fontSize = Math.min(baseFontSize, 12);
  } else {
    fontSize = Math.min(baseFontSize, 24);
  }

  return (
    <div
      className={compact ? 'px-2 py-0.5 text-center font-bold' : 'px-4 py-2 text-center font-bold'}
      title={title}
      style={{
        fontSize,
        fontFamily: titleFont.family || 'Arial, sans-serif',
        fontWeight: titleFont.weight || 'bold',
        color: titleFont.color || '#333',
        lineHeight: 1.2,
        paddingLeft: paddingRight,
        paddingRight,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {title}
    </div>
  );
}
