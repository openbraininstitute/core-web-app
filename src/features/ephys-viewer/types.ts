import { RecordingType, SweepData } from '@/features/ephys-viewer/nwb-trace';

export type ZoomRanges = Record<'x' | 'y', Array<number | undefined>>;

export type PlotProps = {
  recordingType: RecordingType;
  reset: boolean;
  setSelectedSweeps: (sweeps: string[]) => void;
  sweeps: {
    selectedSweeps: string[];
    previewSweep?: string;
    sweepDataMap: Map<string, SweepData>;
    allSweeps: string[];
    colorMap: Map<string, string>;
  };
};
