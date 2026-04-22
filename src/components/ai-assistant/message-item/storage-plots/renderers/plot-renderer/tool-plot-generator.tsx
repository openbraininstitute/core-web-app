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

  if (!isString(content)) return null;
  if (type !== 'json') return <b>{type}</b>;

  let props;
  try {
    props = JSON.parse(content);
  } catch (ex) {
    logError('Unable to parse JSON:', content);
    return null;
  }

  const title = props.layout?.title?.text || props.layout?.title || '';
  const titleFont = props.layout?.title?.font || {};

  const modifiedLayout = {
    ...props.layout,
    title: undefined,
    autosize: true,
    margin: { ...props.layout?.margin, t: 10, l: 3, r: 3, b: 3 },
  };

  const fullscreenLayout = {
    ...props.layout,
    title: undefined,
    autosize: true,
    width: undefined,
    height: undefined,
    margin: props.layout?.margin,
    font: {
      ...props.layout?.font,
      size: Math.max(props.layout?.font?.size || 12, 16),
    },
    xaxis: {
      ...props.layout?.xaxis,
      title: {
        ...props.layout?.xaxis?.title,
        font: {
          ...props.layout?.xaxis?.title?.font,
          size: Math.max(props.layout?.xaxis?.title?.font?.size || 14, 18),
        },
      },
      tickfont: {
        ...props.layout?.xaxis?.tickfont,
        size: Math.max(props.layout?.xaxis?.tickfont?.size || 12, 14),
      },
    },
    yaxis: {
      ...props.layout?.yaxis,
      title: {
        ...props.layout?.yaxis?.title,
        font: {
          ...props.layout?.yaxis?.title?.font,
          size: Math.max(props.layout?.yaxis?.title?.font?.size || 14, 18),
        },
      },
      tickfont: {
        ...props.layout?.yaxis?.tickfont,
        size: Math.max(props.layout?.yaxis?.tickfont?.size || 12, 14),
      },
    },
    legend: {
      ...props.layout?.legend,
      font: {
        ...props.layout?.legend?.font,
        size: Math.max(props.layout?.legend?.font?.size || 12, 14),
      },
    },
  };

  const handleShow = () => {
    refDialog.current?.showModal();
  };

  return (
    <>
      <div
        className={classNames('h-full', styles.plotContainer)}
        style={isAnimating ? { contain: 'strict' } : undefined}
      >
        <button
          type="button"
          onClick={handleShow}
          className={styles.fullscreenButton}
          aria-label="View fullscreen"
        >
          <FullscreenOutlined />
        </button>
        {title && <PlotTitle title={title} titleFont={titleFont} paddingRight="40px" />}
        {!plotReady && <ToolSkeleton />}
        <div
          key={plotRenderKey}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
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
            data={props.data}
            layout={modifiedLayout}
            frames={props?.frames}
            config={{
              displaylogo: false,
              responsive: true,
              modeBarButtons: [['pan2d', 'zoom2d', 'resetScale2d', 'toImage']],
            }}
            useResizeHandler
            onInitialized={() => setPlotReady(true)}
            onUpdate={() => setPlotReady(true)}
            onDoubleClick={handleShow}
          />
        </div>
      </div>
      <FullscreenDialog dialogRef={refDialog}>
        {title && <PlotTitle title={title} titleFont={titleFont} isFullscreen />}
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
}: {
  title: string;
  titleFont: { size?: number; family?: string; weight?: string; color?: string };
  paddingRight?: string;
  isFullscreen?: boolean;
}) {
  const baseFontSize = titleFont.size || 16;
  const fontSize = isFullscreen ? Math.max(baseFontSize, 24) : Math.min(baseFontSize, 24);

  return (
    <div
      className="px-4 py-2 text-center font-bold"
      title={title}
      style={{
        fontSize,
        fontFamily: titleFont.family || 'Arial, sans-serif',
        fontWeight: titleFont.weight || 'bold',
        color: titleFont.color || '#333',
        lineHeight: 1.3,
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
