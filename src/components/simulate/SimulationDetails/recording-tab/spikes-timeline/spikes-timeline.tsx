import { Slider } from 'antd';

import { IconPause } from '@/components/icons/pause';
import { IconPlay } from '@/components/icons/play';
import { cn } from '@/utils/css-class';

import type { TimelineManagerInterface } from '../hooks';

import styles from './spikes-timeline.module.css';

export interface SpikesTimelineProps {
  className?: string;
  manager: TimelineManagerInterface;
}

export function SpikesTimeline({ className, manager }: SpikesTimelineProps) {
  const [spikeProgress, setSpikeProgress] = manager.useProgress();
  const [spikePlaying, setSpikePlaying] = manager.usePlaying();
  const togglePlaying = () => {
    setSpikePlaying(!spikePlaying);
  };

  return (
    <div className={cn(className, styles.spikesTimeline)}>
      <button type="button" onClick={togglePlaying}>
        {spikePlaying ? <IconPause /> : <IconPlay />}
      </button>
      <Slider min={0} max={1} step={1e-4} value={spikeProgress} onChange={setSpikeProgress} />
    </div>
  );
}
