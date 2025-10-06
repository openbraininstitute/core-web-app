'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { motion } from 'motion/react';
import { useMemo } from 'react';

import {
  type ThreeDVisualizerQueryParamKeys,
  threeDVisualizerState,
  threeDVisualizerQueryParam,
} from '@/ui/segments/workflows/simulate/single-neuron/shared/constant';
import { NeuronViewerContainer } from '@/components/neuron-viewer/neuron-viewer-with-actions';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { cn } from '@/utils/css-class';

type Props = {
  sessionId: string;
  memodelId: string;
};

export function NeuronVisualizer({ sessionId, memodelId }: Props) {
  const { virtualLabId, projectId } = useWorkspace();
  const queryParams = useSearchParams();
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
    const params = new URLSearchParams(queryParams);
    params.set(threeDVisualizerQueryParam, v);
    replace(`${pathname}?${params.toString()}`);
  };
  return (
    memodelId && (
      <motion.div
        id="neuron-visualizer"
        data-testid="neuron-visualizer"
        className={cn(
          'flex h-full max-h-full min-w-0 flex-1 items-end justify-end justify-self-end',
          { 'text-primary-9 bg- mr-3 w-full': isExpanded },
          { 'mr-3 rounded-full border-black bg-black text-white shadow-md': isCollapsed }
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
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <button
                type="button"
                className="inline-flex size-10 items-center justify-center rounded bg-[#3A3A3A] px-3 py-3"
                aria-label="Collapse 3D visualizer"
                onClick={() => updateVisualizerState(threeDVisualizerState.Collapsed)}
              >
                <MinusOutlined className="text-white" />
              </button>
            </div>

            <div className="relative w-full flex-1 border-none">
              <NeuronViewerContainer
                useCursor
                useEvents
                useZoomer
                useActions
                useLabels
                virtualLabId={virtualLabId}
                projectId={projectId}
                meModelId={memodelId}
                sessionId={sessionId}
                zoomPlacement="right"
              />
            </div>
          </div>
        )}
      </motion.div>
    )
  );
}
