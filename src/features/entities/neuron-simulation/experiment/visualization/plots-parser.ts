import { PlotDataEntry } from '@/services/bluenaas-single-cell/types';
import { logError } from '@/util/logger';

export interface PlotInstance {
  recording: string;
  /** If specified, it will appear above the plot. */
  title?: string;
  /** X axis label. */
  xaxis: string;
  /** Y axis label. */
  yaxis: string;
  lines: Array<{
    name: string;
    color: string;
    x: number[];
    y: number[];
  }>;
}

export function parsePlots(entries: PlotDataEntry[]): PlotInstance[] {
  const plots = new Map<string, PlotInstance>();
  for (const entry of entries) {
    const key = makeKey(entry);
    if (!key) {
      logError('Unable to recognize this plot:', entry);
      continue;
    }

    const plot: PlotInstance = createPlotInstance(plots.get(key), entry);
    plots.set(key, plot);
  }
  return Array.from(plots.entries())
    .sort(([key1], [key2]) => {
      if (key1 < key2) return -1;
      if (key1 > key2) return +1;
      return 0;
    })
    .map(([, plotInstance]) => distributeColors(plotInstance));
}

function makeKey(entry: PlotDataEntry): string | null {
  if (!entry.variable_name || entry.variable_name === 'v') {
    // This is voltage, we put a key that will be sorted first.
    return '1.voltage';
  }

  if (entry.variable_name.startsWith('i')) {
    // This is a current.
    return `2.${entry.name}.${entry.unit}`;
  }

  return null;
}

function createPlotInstance(base: PlotInstance | undefined, entry: PlotDataEntry): PlotInstance {
  if (isVoltagePlot(entry)) {
    return {
      ...base,
      xaxis: 'Time (ms)',
      yaxis: `Voltage (${entry.unit ?? 'mV'})`,
      lines: updatePlots(base?.lines, makeLineForVoltage(entry)),
      recording: entry.recording ?? 'recording',
    };
  }
  return {
    ...base,
    title: entry.name,
    xaxis: 'Time (ms)',
    yaxis: `Current (${entry.unit ?? '?'})`,
    lines: updatePlots(base?.lines, makeLineForCurrent(entry)),
    recording: entry.recording ?? 'recording',
  };
}

function isVoltagePlot(entry: PlotDataEntry) {
  return makeKey(entry)?.startsWith('1.');
}

function updatePlots(
  lines: PlotInstance['lines'] | undefined,
  line: PlotInstance['lines'][0]
): PlotInstance['lines'] {
  if (!lines) return [line];

  const index = lines.findIndex((item) => item.name === line.name);
  const newLines = lines.slice();
  if (index === -1) newLines.push(line);
  else newLines[index] = line;
  return newLines;
}

function makeLineForVoltage(entry: PlotDataEntry): PlotInstance['lines'][0] {
  return {
    color: entry.line?.color ?? '',
    name: entry.name ?? 'Protocol',
    x: entry.x,
    y: entry.y,
  };
}

function makeLineForCurrent(entry: PlotDataEntry): PlotInstance['lines'][0] {
  return {
    color: entry.line?.color ?? '',
    name: entry.variable_name ?? 'Variable',
    x: entry.x,
    y: entry.y,
  };
}

function distributeColors(plotInstance: PlotInstance): PlotInstance {
  if (plotInstance.lines.length === 0) return plotInstance;

  const step = 360 / plotInstance.lines.length;
  let angle = 0;
  for (const line of plotInstance.lines) {
    line.color = `hsl(${angle}deg 100% 50%)`;
    angle += step;
  }
  return plotInstance;
}
