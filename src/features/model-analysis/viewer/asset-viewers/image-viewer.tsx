import { Empty, Skeleton } from 'antd';
import { kebabCase } from 'es-toolkit/compat';
import Image from 'next/image';
import { match, P } from 'ts-pattern';

import { config } from '@/config';
import { useClientCachedUrl } from '@/features/model-analysis/viewer/asset-viewers/storage';

import type { TEntityTypeDict } from '@/api/entitycore/types';

type Props = {
  entityId: string;
  assetId: string;
  entityType: TEntityTypeDict;
};

export default function ImageViewer({ entityId, entityType, assetId }: Props) {
  const imageFileUrl = `${config.ENTITY_CORE_URL}/${kebabCase(entityType)}/${entityId}/assets/${assetId}/download`;
  const {
    cachedUrl,
    loading: isCaching,
    error,
  } = useClientCachedUrl({
    url: imageFileUrl,
    urlKey: `${entityId}/${assetId}`,
  });

  return match({ cachedUrl, isCaching, error })
    .with({ isCaching: true }, () => (
      <Skeleton.Image
        active
        className="h-full! w-full! rounded-none"
        rootClassName="!h-full !w-full"
      />
    ))
    .with({ cachedUrl, isCaching }, ({ cachedUrl: _cachedUrl }) => (
      <div className="relative flex h-96 w-full max-w-2xl items-center justify-center rounded-lg bg-white">
        <Image
          fill
          objectFit="contains"
          alt="Stimulus plot"
          className="border-neutral-2 border"
          src={_cachedUrl!}
        />
      </div>
    ))
    .with({ error: P.not(null) }, () => (
      <Empty
        description="An Error occurred for this analysis"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    ))
    .otherwise(() => null);
}
