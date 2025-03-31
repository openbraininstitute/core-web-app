import { useEffect, useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { Empty, Skeleton } from 'antd';
import Image from 'next/image';
import isNil from 'lodash/isNil';

import buildQueryString from '@/util/query-params-builder';
import { AssetTypeToEndpoint } from '@/api/thumbnail-svc/context';
import { thumbnailGenerationBaseUrl } from '@/config';
import { EntityCoreResourceWithAssets } from '@/api/entitycore/types/shared/global';
import { ENTITY_CORE_DATA_TYPES } from '@/api/entitycore/types/shared/context';
import authFetch from '@/authFetch';

export default function PreviewThumbnail({
  resource,
  className,
  dpi,
  height,
  width,
  target,
  alt = 'img preview',
}: {
  resource: EntityCoreResourceWithAssets;
  className?: string;
  dpi?: number;
  height: number;
  width: number;
  target?: 'simulation' | 'stimulus';
  alt?: string;
}) {
  const endpoint = AssetTypeToEndpoint[resource.type];
  const { ref, inView } = useInView({
    threshold: 0.2,
  });

  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    async function thumb() {
      if (resource.type === 'reconstruction-morphology') {
        setLoading(true);
        console.log('ᦨ #  preview.tsx:52 #  thumb #  resource.assets:', resource.assets);
        const asset = resource.assets.find(
          (o) =>
            o.meta.legacy.encodingFormat ===
            ENTITY_CORE_DATA_TYPES.RECONSTRUCTION_MORPHOLOGY.assetExtension
        );

        console.log('ᦨ #  preview.tsx:65 #  thumb #  asset:', asset);

        if (isNil(asset?.meta.legacy.contentUrl)) {
          setThumbnail(null);

          return;
        }
        const encodedContentUrl = encodeURIComponent(asset?.meta.legacy.contentUrl);
        const queryParams = buildQueryString({
          dpi,
          target,
        });

        const requestUrl = `${thumbnailGenerationBaseUrl}/generate/${endpoint}?content_url=${encodedContentUrl}&${queryParams}`;
        console.log('ᦨ #  preview.tsx:59 #  thumb #  requestUrl:', requestUrl);
        authFetch(requestUrl, {
          method: 'GET',
          headers: { Accept: 'image/png' },
        })
          .then((response) => response.blob())
          .then((blob) => {
            if (blob.type === 'image/png') {
              setThumbnail(URL.createObjectURL(blob));
            }
            setLoading(false);
          })
          .catch(() => setLoading(false));
      }
    }
    if (inView) {
      setLoading(true);
      thumb().then(() => setLoading(false));
    }
  }, [dpi, target, endpoint, inView, resource]);

  if (thumbnail) {
    return <Image alt={alt} className={className} height={height} src={thumbnail} width={width} />;
  }

  return (
    <div ref={ref} className="flex items-center justify-center" style={{ height, width }}>
      {loading ? (
        <Skeleton.Image
          active={loading}
          className="!h-full !w-full rounded-none"
          rootClassName="!h-full !w-full"
        />
      ) : (
        <Empty description="No thumbnail available" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </div>
  );
}
