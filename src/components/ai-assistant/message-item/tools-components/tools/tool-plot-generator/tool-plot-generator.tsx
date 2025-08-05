/* eslint-disable react/no-array-index-key */
import React from 'react';

import { usePlotFile } from '../hooks';
import { ToolResult } from '../types';
import LineChart from './line-chart';

import { classNames } from '@/util/utils';
import { isString } from '@/util/type-guards';

import styles from './tool-plot-generator.module.css';

export interface ToolPlotGeneratorProps {
  className?: string;
  results: ToolResult[];
}

export default function ToolPlotGenerator({ className, results }: ToolPlotGeneratorProps) {
  return (
    <>
      {results.map((result) => {
        return <CustomPlot className={className} key={result.storage_id} result={result} />;
      })}
    </>
  );
}

const plotters: Record<string, React.FC<{ value: string; className?: string }>> = {
  'json-linechart': LineChart,
};

function CustomPlot({ result, className }: { result: ToolResult; className?: string }) {
  const { data } = usePlotFile(result.storage_id);
  if (!data) return null;

  const Plotter = plotters[data.type];
  if (!Plotter) return <b>{data.type}</b>;

  const { content } = data;
  if (!isString(content)) return null;

  return <Plotter className={classNames(className, styles.toolPlotGenerator)} value={content} />;
}
