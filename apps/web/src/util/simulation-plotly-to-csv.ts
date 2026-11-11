import { saveAs } from 'file-saver';
import JSZip from 'jszip';

import type { PlotInstance } from '@/features/entities/neuron-simulation/experiment/visualization/plots-parser';
import type { PlotData, PlotDataEntry } from '@/services/bluenaas-single-cell/types';

function getPlotlyAsCsv(trace: PlotDataEntry) {
  const csvContent = `time[ms],voltage[mV]\n${trace.x.map((x, i) => `${x},${trace.y[i]}`).join('\n')}`;
  return csvContent;
}

export async function exportSingleSimulationResultAsZip({
  name,
  type,
  result,
}: {
  name: string;
  type: 'stimulus' | 'simulation';
  result: PlotData;
}) {
  const zip = new JSZip();
  const folder = zip.folder(name);
  if (folder) {
    result.forEach((trace) => {
      folder.file(
        `${type === 'stimulus' ? 'stimulus' : trace.recording}_${trace.name}.csv`,
        getPlotlyAsCsv(trace)
      );
    });
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${name}.zip`);
  }
}

function getPlotInstanceAsCsv(instance: PlotInstance, line: { x: number[]; y: number[] }) {
  const csvContent = `${instance.xaxis},${instance.yaxis}\n${line.x.map((x, i) => `${x},${line.y[i]}`).join('\n')}`;
  return csvContent;
}

export async function exportSingleSimulationResultWithCurrentsAsZip({
  name,
  type,
  plotInstances,
}: {
  name: string;
  type: 'stimulus' | 'simulation';
  plotInstances: PlotInstance[];
}) {
  const zip = new JSZip();
  const folder = zip.folder(name);
  if (folder) {
    for (const instance of plotInstances) {
      const prefix = `${type === 'stimulus' ? 'stimulus' : instance.recording}`;
      if (instance.title) {
        // Current
        for (const line of instance.lines) {
          folder.file(
            `${prefix}_current_${instance.title}_${line.name}.csv`,
            getPlotInstanceAsCsv(instance, line)
          );
        }
      } else {
        // Voltage
        for (const line of instance.lines) {
          folder.file(`${prefix}_voltage_${line.name}.csv`, getPlotInstanceAsCsv(instance, line));
        }
      }
    }
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${name}.zip`);
  }
}

export async function exportSimulationResultsAsZip({
  name,
  result,
}: {
  name: string;
  result: Record<string, PlotData>;
}) {
  const zip = new JSZip();
  for (const [folderName, traces] of Object.entries(result)) {
    const folder = zip.folder(folderName);
    if (folder) {
      traces.forEach((trace) => {
        folder.file(`${trace.recording}_${trace.name}.csv`, getPlotlyAsCsv(trace));
      });
    }
  }
  if (Object.keys(zip.files).length) {
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${name}.zip`);
  }
}
