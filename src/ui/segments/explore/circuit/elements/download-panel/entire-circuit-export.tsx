import { Button } from 'antd';
import { get } from 'es-toolkit/compat';
import { useParams } from 'next/navigation';

import { EntityTypeDict } from '@/api/entitycore/types';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { getAssetElement } from '@/api/entitycore/utils';
import { tryCatch } from '@/api/utils';
import { DownloadIcon } from '@/components/icons';
import { notify } from '@/components/notification';
import { getEntityCorePresignedUrl } from '@/services/entity-download/pre-singed-url';
import { formatBytes } from '@/utils/format';
import { log } from '@/utils/logger';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  circuit: ICircuit;
};

export default function EntireCircuitExport({ circuit }: Props) {
  const { virtualLabId, projectId } = useParams<WorkspaceContext>();
  const assets = circuit?.assets;
  const configAsset = getAssetElement({
    assets,
    filter: (asset) => asset.label === AssetLabel.compressed_sonata_circuit,
  });
  const extension = configAsset?.content_type.split('/').pop();

  const onDownload = async () => {
    const { data, error } = await tryCatch(
      getEntityCorePresignedUrl({
        configAssetId: configAsset?.id!,
        entityId: circuit.id,
        entityType: EntityTypeDict.Circuit,
        virtualLabId,
        projectId,
      })
    );
    if (data) {
      window.open(data.url, '_blank', 'noopener,noreferrer');
    }
    if (error) {
      log('error', 'Error downloading entire circuit:', error);
      notify.error({
        title: 'Download Error',
        description: get(error, 'message', 'An error occurred while downloading the circuit.'),
      });
    }
  };

  const totalSize =
    configAsset?.size && configAsset?.size > 1 ? formatBytes(configAsset?.size) : '';

  return (
    <div className="bg-primary-8 mx-8 flex flex-col justify-between rounded-md p-8 shadow-xs">
      <div id="download-header" className="flex w-full items-start justify-between gap-3">
        <div className="w-3/4 hyphens-auto">
          <div className="text-xl font-bold tracking-wide text-white uppercase">
            Download full circuit
          </div>
          <p className="text-primary-2 text-sm leading-normal font-light hyphens-auto">
            The complete circuit compressed in SONATA format.{' '}
            <a
              href="https://sonata-extension.readthedocs.io/en/latest/sonata_overview.html"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              Documentation
            </a>
            .
          </p>
        </div>
        <div className="text-primary-1 flex flex-row items-center gap-x-3 font-semibold">
          <div>{totalSize}</div>
          <div>{extension}</div>
          <Button
            htmlType="button"
            type="link"
            className="border-primary-6 flex items-center justify-center rounded-none border border-solid text-white! hover:text-white! [&_.ant-btn-icon]:text-white!"
            aria-label={`Download ${circuit.name}`}
            title={`Download ${circuit.name}`}
            icon={<DownloadIcon className="text-white!" />}
            onClick={onDownload}
          />
        </div>
      </div>
    </div>
  );
}
