import {
  MorphoViewerEvent,
  type MorphoViewerSimulController,
  useEventValue,
} from '@bbp/morphoviewer';
import React from 'react';

class TimelineManager {
  private controller: MorphoViewerSimulController | null = null;
  private readonly eventProgress = new MorphoViewerEvent<number>();
  private readonly eventPlaying = new MorphoViewerEvent<boolean>();

  useProgress(): [progress: number, setProgress: (progress: number) => void] {
    const progress = useEventValue(this.controller?.spikeProgress ?? 0, this.eventProgress);
    return [
      progress,
      (value: number) => {
        const { controller } = this;
        if (controller) controller.spikeProgress = value;
        else this.eventProgress.dispatch(value);
      },
    ];
  }

  usePlaying(): [playing: boolean, setPlaying: (playing: boolean) => void] {
    const playing = useEventValue(this.controller?.spikePlaying ?? false, this.eventPlaying);
    return [
      playing,
      (value: boolean) => {
        const { controller } = this;
        if (controller) controller.spikePlaying = value;
        else this.eventPlaying.dispatch(value);
      },
    ];
  }

  readonly onReady = (controller: MorphoViewerSimulController) => {
    this.controller = controller;
    controller.eventSpikeProgressChange.addListener((progress) =>
      this.eventProgress.dispatch(progress)
    );
    controller.eventSpikePlayingChange.addListener((playing) =>
      this.eventPlaying.dispatch(playing)
    );
  };
}

export type TimelineManagerInterface = TimelineManager;

export function useTimelineManager(): TimelineManager {
  const ref = React.useRef<TimelineManager | null>(null);
  if (!ref.current) ref.current = new TimelineManager();
  return ref.current;
}
