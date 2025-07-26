'use client';

import { CloseOutlined } from '@ant-design/icons';
import { useAtomValue, useSetAtom } from 'jotai';
import { useHotkeys } from 'react-hotkeys-hook';
import { useEffect, useState } from 'react';
import sum from 'lodash/sum';

import NetworkAndMorphologyConfig from '@/features/entities/circuit/elements/download-panel/network-morphology-config';
import ConnectivityMatrices from '@/features/entities/circuit/elements/download-panel/connectivity-matrices';
import EntireCircuitExport from '@/features/entities/circuit/elements/download-panel/entire-circuit-export';

import { customRowSelectionEventListener } from '@/components/explore-section/ExploreSectionListingView/expandable-row/custom-row-selection-event';
import {
  fileCounterAtom,
  updateFileCounterAtom,
} from '@/features/entities/circuit/elements/download-panel/helpers';
import { classNames } from '@/util/utils';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

export default function DownloadPanel() {
  const [circuit, setCircuit] = useState<ICircuit | null>(null);
  const fileCounter = useAtomValue(fileCounterAtom);
  const updateFileCounter = useSetAtom(updateFileCounterAtom);
  const allFilesCount = fileCounter ? sum(Object.values(fileCounter)) : null;

  const onClose = () => {
    setCircuit(null);
    updateFileCounter(null);
  };

  useHotkeys('Escape', onClose);
  useEffect(() => {
    const unsubscribe = customRowSelectionEventListener<ICircuit>((event) => {
      setCircuit(event.detail?.record ?? null);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (!circuit) return null;
  return (
    <div className="relative w-full">
      <div // eslint-disable-line jsx-a11y/click-events-have-key-events
        role="button"
        tabIndex={0}
        aria-label="Close download panel mask"
        onClick={onClose}
        className={classNames(
          'fixed top-0 left-0 z-80 h-screen w-screen bg-black transition-opacity duration-500',
          circuit ? 'opacity-50' : 'pointer-events-none opacity-0'
        )}
      />
      <div
        data-testid="circuit-download-panel"
        className={classNames(
          'bg-primary-9 primary-scrollbar fixed top-0 right-0 z-100 flex h-full min-h-screen w-[50svw] shrink-0 flex-col space-y-4 overflow-x-hidden overflow-y-auto',
          circuit ? 'block' : 'hidden'
        )}
      >
        <div className="bg-primary-9 sticky top-0 z-20 mb-2 flex items-center justify-between gap-4 px-8 py-6">
          <span className="text-primary-6 flex items-baseline gap-2 text-lg font-bold">
            Download files{' '}
            <small className="text-primary-2 text-base font-light">
              Total files: {allFilesCount}
            </small>
          </span>
          <button
            autoFocus // eslint-disable-line jsx-a11y/no-autofocus
            type="button"
            onClick={onClose}
            className="hover:bg-neutral-1/10 rounded-md px-2 py-1 text-white"
            aria-label="Close"
          >
            <CloseOutlined />
          </button>
        </div>
        <EntireCircuitExport circuit={circuit} />
        <div className="border-primary-7 text-primary-4 mx-8 my-8 border-y border-solid py-4 text-xl font-bold tracking-wide uppercase">
          Download components only
        </div>
        <div className="flex w-full flex-col gap-y-12 px-8 pb-10">
          <ConnectivityMatrices key="connectivity-metrics-content" circuit={circuit} />
          <NetworkAndMorphologyConfig key="network-and-morphology-content" circuit={circuit} />
        </div>
      </div>
    </div>
  );
}
