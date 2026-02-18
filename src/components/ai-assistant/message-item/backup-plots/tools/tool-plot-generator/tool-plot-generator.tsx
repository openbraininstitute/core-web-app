/* eslint-disable react/no-array-index-key */

import { FullscreenOutlined } from '@ant-design/icons';
import dynamic from 'next/dynamic';
import React from 'react';

import { logError } from '@/util/logger';
import { isString } from '@/util/type-guards';
import { classNames } from '@/util/utils';

import ToolSkeleton from '../tool-skeleton';

import type { ToolResult } from '../types';

import styles from './tool-plot-generator.module.css';

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export interface ToolPlotGeneratorProps {
  className?: string;
  result: ToolResult | null;
  data?: { content: string; type: string };
}

export default function ToolPlotGenerator({
  className,
  result,
  data: providedData,
}: ToolPlotGeneratorProps) {
  if (!result) return null;

  return (
    <>
      {
        // python-tool can return a list of storage_ids
        Array.isArray(result.storage_id)
          ? result.storage_id.map(
              (storage_id: string, index: number) =>
                providedData && (
                  <CustomPlot className={className} key={storage_id} providedData={providedData} />
                )
            )
          : providedData && (
              <CustomPlot
                className={className}
                key={result.storage_id}
                providedData={providedData}
              />
            )
      }
    </>
  );
}
function CustomPlot({
  className,
  providedData,
}: {
  className?: string;
  providedData: { content: string; type: string };
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
  const titleHeight = title ? 60 : 0;
  const plotHeight = 400 - titleHeight;
  const plotWidth = 600;

  const modifiedLayout = {
    ...props.layout,
    title: undefined,
    autosize: true,
    height: plotHeight,
    margin: {
      ...props.layout?.margin,
      t: (props.layout?.margin?.t || 80) - 40,
    },
  };

  const fullscreenLayout = {
    ...props.layout,
    title: undefined,
    autosize: true,
    margin: props.layout?.margin,
  };

  const handleShow = () => {
    refDialog.current?.showModal();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      refDialog.current?.close();
    }
  };

  return (
    <>
      <div
        className={classNames('h-full', styles.plotContainer)}
        style={{ width: `${plotWidth}px`, maxWidth: '100%' }}
        onDoubleClick={handleShow}
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
          <div
            className="px-4 py-2 text-center font-bold break-words hyphens-auto"
            style={{
              fontSize: titleFont.size || 16,
              fontFamily: titleFont.family || 'Arial, sans-serif',
              fontWeight: titleFont.weight || 'bold',
              color: titleFont.color || '#333',
              lineHeight: 1.3,
            }}
          >
            {title}
          </div>
        )}
        {!plotReady && <ToolSkeleton />}
        <Plot
          className={classNames(className, styles.toolPlotGenerator)}
          style={{
            width: '100%',
            height: `${plotHeight}px`,
            display: plotReady ? 'block' : 'none',
          }}
          data={props.data}
          layout={modifiedLayout}
          frames={props?.frames}
          config={{ displaylogo: false, responsive: true, doubleClick: 'reset' }}
          useResizeHandler
          onInitialized={() => setPlotReady(true)}
          onUpdate={() => setPlotReady(true)}
          onDoubleClick={handleShow}
        />
      </div>
      <dialog ref={refDialog} className={styles.dialog}>
        <div className={styles.dialogBackdrop} onClick={handleBackdropClick}>
          <div className={styles.dialogContent} onClick={(e) => e.stopPropagation()}>
            {title && (
              <div
                className="px-4 py-2 text-center font-bold break-words hyphens-auto"
                style={{
                  fontSize: titleFont.size || 16,
                  fontFamily: titleFont.family || 'Arial, sans-serif',
                  fontWeight: titleFont.weight || 'bold',
                  color: titleFont.color || '#333',
                  lineHeight: 1.3,
                }}
              >
                {title}
              </div>
            )}
            <Plot
              style={{
                width: '90vw',
                height: title ? 'calc(90vh - 60px)' : '90vh',
                display: fullscreenPlotReady ? 'block' : 'none',
              }}
              data={props.data}
              layout={fullscreenLayout}
              frames={props?.frames}
              config={{ displaylogo: false, responsive: true }}
              useResizeHandler
              onInitialized={() => setFullscreenPlotReady(true)}
              onUpdate={() => setFullscreenPlotReady(true)}
            />
          </div>
        </div>
      </dialog>
    </>
  );
}
