'use client';

import { CloseOutlined, LoadingOutlined } from '@ant-design/icons';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Spin } from 'antd';
import get from 'lodash/get';

import { customRowSelectionEventListener } from '@/components/explore-section/ExploreSectionListingView/expandable-row/custom-row-selection-event';
import { EntireCircuitExport } from '@/features/entities/circuit/elements/full-circuit-download';
import ConfigItem, { ConfigItemProps } from '@/features/entities/circuit/elements/config-item';
import { configurationText } from '@/features/entities/circuit/elements/configuration-text';
import { downloadAsset, listDirectoryOfAssets } from '@/api/entitycore/queries/assets';
import { buildNetworksConfig } from '@/features/entities/circuit/elements/helpers';
import { useAppNotification } from '@/components/notification';
import { getAssetElement } from '@/api/entitycore/utils';
import { messages } from '@/i18n/en/circuit';
import { classNames } from '@/util/utils';
import { log } from '@/utils/logger';

import type { ICircuit, ICircuitConfiguration } from '@/api/entitycore/types/entities/circuit';
import type { DirectoryListContent } from '@/api/entitycore/types/shared/global';
import type { WorkspaceContext } from '@/types/common';
import { EntityTypeEnum } from '@/api/entitycore/types';

type ConfigState<T> =
  | {
      error: string | null;
      data: undefined;
    }
  | {
      error: undefined;
      data: T | null;
    };

export default function DownloadPanel() {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const [circuit, setCircuit] = useState<ICircuit | null>(null);
  const [loading, setLoading] = useState(false);
  const notify = useAppNotification();
  const [circuitConfig, setCircuitConfig] = useState<ConfigState<ICircuitConfiguration>>({
    error: null,
    data: undefined as never,
  });

  const [directoryList, setDirectoryList] = useState<ConfigState<DirectoryListContent['files']>>({
    error: null,
    data: undefined as never,
  });

  const assetConfig = getAssetElement({
    assets: circuit?.assets,
    filter: (asset) => asset.label === 'sonata_circuit',
  });

  const onClose = () => {
    setCircuit(null);
    setCircuitConfig({ data: null, error: undefined });
    setCircuitConfig({ data: null, error: undefined });
  };

  useEffect(() => {
    const unsubscribe = customRowSelectionEventListener<ICircuit>((event) => {
      setCircuit(event.detail.record);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    async function fetchCircuit() {
      setLoading(true);
      if (circuit) {
        try {
          if (!assetConfig) {
            setCircuitConfig({
              error: 'Circuit config not found',
              data: undefined,
            });
            return;
          }

          const [listingDirectoryPromise, configPromise] = await Promise.allSettled([
            listDirectoryOfAssets({
              entityType: EntityTypeEnum.Circuit,
              entityId: circuit.id,
              id: assetConfig.id,
              ctx: { virtualLabId, projectId },
            }),
            downloadAsset({
              entityType: EntityTypeEnum.Circuit,
              entityId: circuit.id,
              id: assetConfig.id,
              ctx: { virtualLabId, projectId },
              asRawResponse: true,
              assetPath: 'circuit_config.json',
            }),
          ]);
          if (listingDirectoryPromise.status === 'fulfilled') {
            setDirectoryList({ data: listingDirectoryPromise.value.files, error: undefined });
          }
          if (listingDirectoryPromise.status === 'rejected') {
            notify.warning({
              message: messages.ListingCircuitDirectoryFailed,
              placement: 'topRight',
            });
            setDirectoryList({ data: undefined, error: listingDirectoryPromise.reason });
          }
          if (configPromise.status === 'fulfilled') {
            const config = await configPromise.value.json();
            setCircuitConfig({ data: config, error: undefined });
          }
          if (configPromise.status === 'rejected') {
            notify.warning({
              message: messages.CircuitConfigurationFailed,
              placement: 'topRight',
            });
            setCircuitConfig({ data: undefined, error: configPromise.reason });
          }
        } catch (error) {
          log('error', error);
          notify.error({
            message: messages.GenerateCircuitDataForDownload,
            placement: 'topRight',
          });
        } finally {
          setLoading(false);
        }
      }
    }

    fetchCircuit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [circuit?.id, assetConfig, virtualLabId, projectId]);

  let content = null;
  if (circuitConfig.data) {
    const networks = buildNetworksConfig(circuitConfig.data.networks, directoryList.data ?? {});
    const fullConfig = configurationText.map((o) => ({
      ...o,
      ...get(networks, o.id, {}),
    })) as unknown as Record<string, Omit<ConfigItemProps, 'className'>>;

    content = Object.values(fullConfig).map((o) => (
      <ConfigItem
        key={o.id}
        id={o.id}
        name={o.name}
        description={o.description}
        count={o.count}
        mimeType={o.mimeType}
        items={o.items}
        showType={o.showType}
        showPrefix={o.showPrefix}
        downloadConfig={{
          entityId: circuit?.id,
          assetConfigId: assetConfig?.id,
          context: { virtualLabId, projectId },
        }}
      />
    ));
  }

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
        {loading && (
          <div className="flex h-full w-full flex-col items-center justify-center">
            <Spin className="px-3 py-2" indicator={<LoadingOutlined className="text-white" />} />
          </div>
        )}
        {content && (
          <>
            <div className="bg-primary-9 sticky top-0 z-20 mb-2 flex items-center justify-between gap-4 px-8 py-6">
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
            {directoryList.data && circuit?.id && assetConfig?.id && (
              <EntireCircuitExport
                directory={directoryList.data}
                entityId={circuit?.id}
                assetId={assetConfig?.id}
                context={{ virtualLabId, projectId }}
              />
            )}
            <div className="border-primary-7 text-primary-4 mx-8 my-8 border-y border-solid py-4 text-xl font-bold tracking-wide uppercase">
              Download components only
            </div>
            <div className="flex w-full flex-col gap-y-12 px-8">{content}</div>
          </>
        )}
      </div>
    </div>
  );
}
