import type {
  RecordingSeries,
  RecordingType,
  SweepSeriesRequest,
} from '@/features/ephys-viewer/trace-index';

export type ZoomRanges = Record<'x' | 'y', Array<number | undefined>>;

export type PlotProps = {
  recordingType: RecordingType;
  recordingIndex: number;
  /** Full-range series for this recording, or undefined while it is still loading. */
  recording: RecordingSeries | undefined;
  /** Base request for this repetition, re-issued with a window when the plot is zoomed. */
  seriesRequest: Omit<SweepSeriesRequest, 'xStart' | 'xEnd'>;
  reset: boolean;
  selectedSweeps: string[];
  setSelectedSweeps: (sweeps: string[]) => void;
  previewSweep?: string;
  colorMap: Map<string, string>;
  /** Bumped when the container resizes, so Plotly re-reads the layout. */
  plotRevision: number;
};
