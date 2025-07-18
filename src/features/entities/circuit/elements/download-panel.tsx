'use client';

import { CloseOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

import { customRowSelectionEventListener } from '@/components/explore-section/ExploreSectionListingView/expandable-row/custom-row-selection-event';
import { FullCircuitItem } from '@/features/entities/circuit/elements/full-circuit-download';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getAssetElement } from '@/api/entitycore/utils';
import { classNames } from '@/util/utils';
import { tryCatch } from '@/api/utils';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';

type CircuitConfig = {};

export default function DownloadPanel() {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const [circuit, setCircuit] = useState<ICircuit | null>(null);

  const [, setCircuitConfig] = useState<{
    loading: boolean;
    error: string | null;
    data: CircuitConfig | null;
  }>({
    loading: false,
    error: null,
    data: null,
  });

  const onClose = () => setCircuit(null);

  useEffect(() => {
    const unsubscribe = customRowSelectionEventListener<ICircuit>((event) => {
      setCircuit(event.detail.record);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchCircuit() {
      setCircuitConfig({
        loading: true,
        error: null,
        data: null,
      });

      if (circuit) {
        const assetConfig = getAssetElement({
          assets: circuit.assets,
          filter: (asset) => asset.label === 'sonata_circuit',
        });
        if (!assetConfig) {
          setCircuitConfig({
            loading: false,
            error: 'Circuit config not found',
            data: null,
          });
          return;
        }
        const { data: assetData, error } = await tryCatch(
          downloadAsset({
            entityType: 'circuit',
            entityId: circuit.id,
            id: assetConfig?.id || '',
            ctx: {
              virtualLabId,
              projectId,
            },
            asRawResponse: true,
            assetPath: 'circuit_config.json',
          })
        );
        if (assetData) {
          const circuitConfig = await assetData.json();
          setCircuitConfig({
            loading: false,
            error: null,
            data: circuitConfig,
          });
          return;
        }
        if (error) {
          setCircuitConfig({
            loading: false,
            error: error.message,
            data: null,
          });
        }
      }
    }
    fetchCircuit();
  }, [circuit, virtualLabId, projectId]);

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
          'bg-primary-9 primary-scrollbar fixed top-0 right-0 z-100 flex h-full min-h-screen w-[40svw] shrink-0 flex-col space-y-4 overflow-x-hidden overflow-y-auto',
          circuit ? 'block' : 'hidden'
        )}
      >
        <div className="bg-primary-9 sticky top-0 mb-2 flex items-center justify-between gap-4 px-8 py-6">
          <span className="text-primary-6 flex items-baseline gap-2 text-lg font-bold">
            Download files{' '}
            <small className="text-primary-2 text-base font-light">Total files: 10</small>
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
        <FullCircuitItem />
        <code className="px-8">
          <pre>{JSON.stringify(circuit, null, 2)}</pre>
        </code>
      </div>
    </div>
  );
}
