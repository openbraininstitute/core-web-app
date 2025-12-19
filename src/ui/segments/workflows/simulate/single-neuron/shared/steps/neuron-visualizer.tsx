'use client';

import { FullscreenOutlined, MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { motion } from 'motion/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useTransition } from 'react';
import { NeuronViewerContainer } from '@/components/neuron-viewer/neuron-viewer-with-actions';
import {
  type ThreeDVisualizerQueryParamKeys,
  threeDVisualizerQueryParam,
  threeDVisualizerState,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import { cn } from '@/utils/css-class';
import { useFullscreenSwitcher } from './hooks';

import styles from './neuron-visualizer.module.css';

type Props = {
  sessionId: string;
  memodelId: string;
  disableElectrodes?: boolean;
  disableSynapses?: boolean;
};

export function NeuronVisualizer({
  sessionId,
  memodelId,
  disableElectrodes,
  disableSynapses,
}: Props) {
  const { refContainer, toggleFullscreen } = useFullscreenSwitcher();
  const queryParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { replace } = useRouter();
  const visualizerState = queryParams.get('3d') as ThreeDVisualizerQueryParamKeys;
  const isCollapsed = visualizerState === threeDVisualizerState.Collapsed;
  const isExpanded = visualizerState === threeDVisualizerState.Expanded;

  const pathname = usePathname();
  const targetWidth = useMemo<string>(() => {
    if (isCollapsed) return '3rem';
    return '100%';
  }, [isCollapsed]);

  const updateVisualizerState = (v: ThreeDVisualizerQueryParamKeys) => {
    startTransition(() => {
      const params = new URLSearchParams(queryParams);
      params.set(threeDVisualizerQueryParam, v);
      replace(`${pathname}?${params.toString()}`);
    });
  };

  return (
    memodelId && (
      <motion.div
        ref={refContainer}
        id="neuron-visualizer"
        data-testid="neuron-visualizer"
        className={cn(
          'flex h-full max-h-full min-w-0 flex-1 items-end justify-end justify-self-end',
          { 'text-primary-9 w-full': isExpanded },
          {
            'rounded-full border-black bg-black text-white shadow-md': isCollapsed,
          },
        )}
        animate={{
          width: targetWidth,
        }}
        initial={false}
        transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      >
        {isCollapsed ? (
          <button
            type="button"
            className="relative flex h-full w-full cursor-pointer items-start justify-center px-2 select-none"
            aria-label="Expand 3D visualizer"
            onClick={() => updateVisualizerState(threeDVisualizerState.Expanded)}
          >
            <div className="absolute top-3 flex items-center justify-center text-white">
              <PlusOutlined className="h-5 w-5" />
            </div>
            <div
              className="text-xl font-bold"
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: 'center',
                whiteSpace: 'nowrap',
                position: 'relative',
                top: '80px',
                margin: 0,
              }}
            >
              3D visualizer
            </div>
          </button>
        ) : (
          <div className="relative flex h-full w-full flex-col rounded-lg">
            <div className="absolute top-4 right-4 z-10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="inline-flex size-10 items-center justify-center rounded bg-[#3A3A3A] px-3 py-3"
                  aria-label="Toggle fullscreen"
                  onClick={toggleFullscreen}
                >
                  <FullscreenOutlined className="text-white" />
                </button>
                <button
                  type="button"
                  className={cn(
                    'inline-flex size-10 items-center justify-center rounded bg-[#3A3A3A] px-3 py-3',
                    styles.hideInFullscreen,
                  )}
                  aria-label="Collapse 3D visualizer"
                  onClick={() => updateVisualizerState(threeDVisualizerState.Collapsed)}
                >
                  <MinusOutlined className="text-white" />
                </button>
              </div>
            </div>

            <div className="absolute h-full w-full flex-1 border-none">
              <NeuronViewerContainer
                disableElectrodes={disableElectrodes}
                disableSynapses={disableSynapses}
                meModelId={memodelId}
                sessionId={sessionId}
              />
            </div>
          </div>
        )}
      </motion.div>
    )
  );
}
