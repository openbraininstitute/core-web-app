/* eslint-disable react/no-array-index-key */
import React from 'react';
import { Data, Layout } from 'plotly.js-dist-min';

import { usePlotFile } from '../hooks';
import { ToolResult } from '../types';
import { assertLineChart, convertLineChart } from './charts/line';
import { assertPieChart, convertPieChart } from './charts/pie';
import GenericPlot from './generic-plot';

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

const plotters: Record<
  string,
  {
    convert(value: any): { data: Data[]; layout: Partial<Layout> } | null;
    assert(data: unknown): asserts data is any;
  }
> = {
  'json-linechart': { convert: convertLineChart, assert: assertLineChart },
  'json-piechart': { convert: convertPieChart, assert: assertPieChart },
  'json-scatterplot': { convert: convertLineChart, assert: assertLineChart },
};

function CustomPlot({ result, className }: { result: ToolResult; className?: string }) {
  const { data } = usePlotFile(result.storage_id);
  if (!data) return null;

  const plotter = plotters[data.type];
  if (!plotter) return <b>{data.type}</b>;

  const { content } = data;
  if (!isString(content)) return null;

  const { convert, assert } = plotter;
  return (
    <GenericPlot
      className={classNames(className, styles.toolPlotGenerator)}
      plotType={data.type}
      value={content}
      convert={convert}
      assert={assert}
    />
  );
}
