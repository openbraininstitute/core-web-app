import { Empty, Skeleton } from 'antd';
import { match, P } from 'ts-pattern';
import Image from 'next/image';

import kebabCase from 'es-toolkit/compat/kebabCase';
import { useClientCachedUrl } from '@/features/model-analysis/viewer/storage';
import { entityCoreUrl } from '@/config';

import { TEntityTypeDict } from '@/api/entitycore/types';

type Props = {
  entityId: string;
  assetId: string;
  entityType: TEntityTypeDict;
};

export default function ImageViewer({ entityId, entityType, assetId }: Props) {
  const imageFileUrl = `${entityCoreUrl}/${kebabCase(entityType)}/${entityId}/assets/${assetId}/download`;
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
        className="!h-full !w-full rounded-none"
        rootClassName="!h-full !w-full"
      />
    ))
    .with({ cachedUrl, isCaching }, ({ cachedUrl: _cachedUrl }) => (
      <div className="relative flex h-96 w-full max-w-2xl items-center justify-center">
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
