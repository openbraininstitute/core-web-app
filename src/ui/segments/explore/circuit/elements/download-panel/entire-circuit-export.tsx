import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { get } from 'es-toolkit/compat';
import { Button } from 'antd';

import { getEntityCorePresignedUrl } from '@/services/entity-download/pre-singed-url';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { keyBuilder } from '@/ui/use-query-keys/third-parties';
import { getAssetElement } from '@/api/entitycore/utils';
import { EntityTypeDict } from '@/api/entitycore/types';
import { DownloadIcon } from '@/components/icons';
import { formatBytes } from '@/utils/format';

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

  const { isLoading, data } = useQuery({
    queryKey: keyBuilder.s3presignedUrl({
      entityType: EntityTypeDict.Circuit,
      entity: circuit.id,
      asset: configAsset?.id!,
      virtualLabId,
      projectId,
    }),
    queryFn: () =>
      getEntityCorePresignedUrl({
        configAssetId: configAsset?.id!,
        entityId: circuit.id,
        entityType: EntityTypeDict.Circuit,
        virtualLabId,
        projectId,
      }),
  });

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
            The complete circuit compressed in SONATA format,
            <a
              href="https://sonata-extension.readthedocs.io/en/latest/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              see more here
            </a>
          </p>
        </div>
        {!isLoading && data && (
          <div className="text-primary-1 flex flex-row gap-x-3 font-semibold">
            <div>{get(data, 'size', totalSize)}</div>
            <div>{extension}</div>
            {get(data, 'url', null) && (
              <Button
                htmlType="button"
                type="link"
                className="border-primary-6 flex items-center justify-center rounded-none border border-solid"
                aria-label={`download ${circuit.name}`}
                title={`download ${circuit.name}`}
                icon={<DownloadIcon className="text-white!" />}
                loading={isLoading}
                href={get(data, 'url', undefined)}
                target="_blank"
                rel="noopener noreferrer"
                download={`${circuit.name}.${circuit.id}`}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
