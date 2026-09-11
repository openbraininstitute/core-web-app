'use client';

import { Alert, Modal, Spin } from 'antd';
import Plotly from 'plotly.js-dist-min';
import { useEffect, useMemo, useRef, useState } from 'react';
import createPlotlyComponent from 'react-plotly.js/factory';

import type { Config, Data, Layout } from 'plotly.js-dist-min';
import type {
  ColumnDistributionRequest,
  ColumnDistributionResponse,
  ColumnMeta,
  FilterModel,
} from '@/features/circuit-nodes/types';

const Plot = createPlotlyComponent(Plotly);

const PLOT_CONFIG: Partial<Config> = {
  displayModeBar: false,
  responsive: true,
  displaylogo: false,
};

const BAR_COLOR = '#4A6FA5';
const OTHER_COLOR = '#9CA3AF';

type Props = {
  open: boolean;
  column: ColumnMeta;
  filterModel: FilterModel | undefined;
  getDistribution: (req: ColumnDistributionRequest) => Promise<ColumnDistributionResponse>;
  onClose: () => void;
};

export default function DistributionModal({
  open,
  column,
  filterModel,
  getDistribution,
  onClose,
}: Props) {
  const [data, setData] = useState<ColumnDistributionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const generationRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    const gen = ++generationRef.current;
    setLoading(true);
    setError(null);
    setData(null);
    getDistribution({ column: column.name, filter: filterModel })
      .then((res) => {
        if (generationRef.current !== gen) return;
        setData(res);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (generationRef.current !== gen) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
    return () => {
      generationRef.current++;
    };
  }, [open, column.name, filterModel, getDistribution]);

  const plot = useMemo(() => buildPlot(data, column), [data, column]);

  return (
    <Modal
      title={`Distribution of "${column.name}"`}
      open={open}
      onCancel={onClose}
      footer={null}
      width={640}
      destroyOnHidden
    >
      {loading && (
        <div className="flex items-center justify-center" style={{ minHeight: 320 }}>
          <Spin />
        </div>
      )}
      {!loading && error && <Alert type="error" message={error} />}
      {!loading && !error && plot && (
        <>
          <Plot
            data={plot.data}
            layout={plot.layout}
            config={PLOT_CONFIG}
            style={{ width: '100%', height: 380 }}
            useResizeHandler
          />
          {plot.footer && <div className="mt-2 text-xs text-gray-500">{plot.footer}</div>}
        </>
      )}
    </Modal>
  );
}

type PlotPayload = {
  data: Data[];
  layout: Partial<Layout>;
  footer: string | null;
};

function buildPlot(
  data: ColumnDistributionResponse | null,
  column: ColumnMeta
): PlotPayload | null {
  if (!data) return null;
  if (data.kind === 'numeric') return buildNumericPlot(data, column);
  return buildCategoricalPlot(data, column);
}

function buildNumericPlot(
  data: Extract<ColumnDistributionResponse, { kind: 'numeric' }>,
  column: ColumnMeta
): PlotPayload {
  if (data.binEdges.length === 0) {
    return {
      data: [],
      layout: { margin: { l: 50, r: 20, t: 20, b: 50 } },
      footer: `No values${data.nullCount > 0 ? ` (${data.nullCount.toLocaleString()} null)` : ''}`,
    };
  }
  const n = data.counts.length;
  const xMid: number[] = new Array(n);
  const widths: number[] = new Array(n);
  for (let i = 0; i < n; i++) {
    xMid[i] = (data.binEdges[i] + data.binEdges[i + 1]) / 2;
    widths[i] = data.binEdges[i + 1] - data.binEdges[i];
  }
  const footerParts = [
    `total ${data.total.toLocaleString()}`,
    `min ${formatNum(data.min)}`,
    `max ${formatNum(data.max)}`,
  ];
  if (data.nullCount > 0) footerParts.push(`${data.nullCount.toLocaleString()} null`);
  return {
    data: [
      {
        type: 'bar',
        x: xMid,
        y: data.counts,
        width: widths,
        marker: { color: BAR_COLOR },
        hovertemplate: '~%{x}: %{y}<extra></extra>',
      },
    ],
    layout: {
      margin: { l: 50, r: 20, t: 20, b: 50 },
      xaxis: { title: { text: column.name } },
      yaxis: { title: { text: 'Count' } },
      bargap: 0.02,
    },
    footer: footerParts.join(' · '),
  };
}

function buildCategoricalPlot(
  data: Extract<ColumnDistributionResponse, { kind: 'categorical' | 'string' }>,
  column: ColumnMeta
): PlotPayload {
  const pairs = data.labels.map((label, i) => ({ label, count: data.counts[i] }));
  pairs.sort((a, b) => b.count - a.count);
  const labels = pairs.map((p) => p.label);
  const counts = pairs.map((p) => p.count);
  const hasOther = data.kind === 'string' && (data.otherCount ?? 0) > 0;
  if (hasOther) {
    labels.push('Other');
    counts.push(data.otherCount as number);
  }
  const colors = labels.map((_, i) =>
    hasOther && i === labels.length - 1 ? OTHER_COLOR : BAR_COLOR
  );
  const footer =
    data.kind === 'string'
      ? `total ${data.total.toLocaleString()} · ${(
          data.distinctCount ?? data.labels.length
        ).toLocaleString()} distinct values`
      : `total ${data.total.toLocaleString()} · ${data.labels.length.toLocaleString()} categories`;
  return {
    data: [
      {
        type: 'bar',
        x: labels,
        y: counts,
        marker: { color: colors },
        hovertemplate: '%{x}: %{y}<extra></extra>',
      },
    ],
    layout: {
      margin: { l: 50, r: 20, t: 20, b: 90 },
      xaxis: { title: { text: column.name }, tickangle: -30, automargin: true },
      yaxis: { title: { text: 'Count' } },
      bargap: 0.2,
    },
    footer,
  };
}

function formatNum(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  if (Number.isInteger(v)) return v.toLocaleString();
  const abs = Math.abs(v);
  if (abs !== 0 && (abs < 1e-3 || abs >= 1e6)) return v.toExponential(3);
  return v.toFixed(4);
}
