'use client';

import { FullscreenOutlined, MinusOutlined, PlusOutlined } from '@ant-design/icons';
import { motion } from 'motion/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { useMemo, useTransition } from 'react';

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
  return (
    memodelId && (
      <NeuronViewerContainer
        disableElectrodes={disableElectrodes}
        disableSynapses={disableSynapses}
        meModelId={memodelId}
        sessionId={sessionId}
      />
    )
  );
}
