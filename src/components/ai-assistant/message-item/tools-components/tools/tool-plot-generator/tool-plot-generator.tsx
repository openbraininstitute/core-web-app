/* eslint-disable react/no-array-index-key */
import { Data, Layout } from 'plotly.js-dist-min';

import { usePlotFile } from '../hooks';
import { ToolResult } from '../types';
import { assertBarChart, convertBarChart } from './charts/bar';
import { assertHistogramChart, convertHistogramChart } from './charts/histogram';
import { assertLineChart, convertLineChart } from './charts/line';
import { assertPieChart, convertPieChart } from './charts/pie';
import { assertScatterChart, convertScatterChart } from './charts/scatter';
import GenericPlot from './generic-plot';

import { isString } from '@/util/type-guards';
import { classNames } from '@/util/utils';

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
  'json-scatterplot': { convert: convertScatterChart, assert: assertScatterChart },
  'json-histogram': { convert: convertHistogramChart, assert: assertHistogramChart },
  'json-barplot': { convert: convertBarChart, assert: assertBarChart },
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
