/* eslint-disable react/no-array-index-key */

import { isString } from '@/util/type-guards';
import { classNames } from '@/util/utils';

import { usePlotFile } from '../hooks';
import ToolSkeleton from '../tool-skeleton';
import { assertBarChart, convertBarChart } from './charts/bar';
import { assertHistogramChart, convertHistogramChart } from './charts/histogram';
import { assertLineChart, convertLineChart } from './charts/line';
import { assertPieChart, convertPieChart } from './charts/pie';
import { assertPlotlyChart, convertPlotlyChart } from './charts/plotly';
import { assertScatterChart, convertScatterChart } from './charts/scatter';
import GenericPlot from './generic-plot';

import type { Data, Layout } from 'plotly.js-dist-min';
import type { ToolResult } from '../types';

import styles from './tool-plot-generator.module.css';

export interface ToolPlotGeneratorProps {
  className?: string;
  result: ToolResult | null;
}

export default function ToolPlotGenerator({ className, result }: ToolPlotGeneratorProps) {
  if (!result) return null;

  return (
    <>
      {
        // python-tool can return a list of storage_ids
        Array.isArray(result.storage_id) ? (
          result.storage_id.map((storage_id: string) => (
            <CustomPlot className={className} key={storage_id} storage_id={storage_id} />
          ))
        ) : (
          <CustomPlot
            className={className}
            key={result.storage_id}
            storage_id={result.storage_id}
          />
        )
      }
    </>
  );
}
// prettier-ignore
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
  json: { convert: convertPlotlyChart, assert: assertPlotlyChart },
};

function CustomPlot({ storage_id, className }: { storage_id: string; className?: string }) {
  const { data, isError, isLoading } = usePlotFile(storage_id);

  if (isError) return null;
  if (isLoading || !data) return <ToolSkeleton />;

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
