import { useQuery } from '@tanstack/react-query';
import { Image } from 'antd';
import { isNil, isNotNil } from 'es-toolkit';
import { useState } from 'react';
import { useInView } from 'react-intersection-observer';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { DETAIL_PREVIEW_DPI, getPreviewBlob, isTransientThumbnailError } from '@/api/thumbnail-svc';
import { thumbnailSourceOf } from '@/features/logbook/editor/blocks/thumbnail-source';
import { Bone } from '@/features/logbook/elements/skeletons';
import { useObjectUrl } from '@/features/logbook/hooks/use-object-url';
import { ThumbnailFrom } from '@/features/logbook/types';
import { Icon } from '@/ui/molecules/icon';
import { keyBuilderLogbook } from '@/ui/use-query-keys/logbook';
import { cn } from '@/utils/css-class';

import type { TEntityTypeDict } from '@/api/entitycore/types/entity-type';
import type { EntityCoreResource } from '@/api/entitycore/types/shared/global';
import type { IEntity, TThumbnailSource } from '@/features/logbook/types';
import type { WorkspaceContext } from '@/types/common';

async function pictureOf(
  entity: EntityCoreResource,
  source: TThumbnailSource,
  project: WorkspaceContext
): Promise<Blob> {
  if (source.from === ThumbnailFrom.Service)
    return getPreviewBlob(
      entity,
      project.virtualLabId,
      project.projectId,
      undefined,
      undefined,
      DETAIL_PREVIEW_DPI
    );
  const bytes = await downloadAsset<unknown>({
    ctx: project,
    entityType: entity.type as TEntityTypeDict,
    entityId: entity.id,
    id: source.asset.id,
  });
  if (!(bytes instanceof ArrayBuffer)) throw new Error('The picture is not an image file.');
  return new Blob([bytes], { type: source.asset.content_type });
}

const PANEL =
  'group/picture relative w-[30%] max-w-[208px] min-w-[104px] flex-none overflow-hidden border-0 border-l border-rule-soft bg-white p-0';

/** The entity's picture down the card's right edge; a click or Enter opens it full size. */
export function EntityThumbnail({
  entity,
  project,
}: {
  readonly entity: IEntity;
  readonly project: WorkspaceContext;
}) {
  const source = thumbnailSourceOf(entity);
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: '200px' });
  const picture = useQuery({
    queryKey: keyBuilderLogbook.picture(entity.id, source?.from ?? null),
    queryFn: () =>
      pictureOf(
        {
          id: entity.id,
          type: entity.type,
          assets: [...(entity.assets ?? [])],
        } as EntityCoreResource,
        source as TThumbnailSource,
        project
      ),
    enabled: inView && isNotNil(source),
    staleTime: Number.POSITIVE_INFINITY,
    retry: (failures, error) => failures < 3 && isTransientThumbnailError(error),
  });
  const url = useObjectUrl(picture.data);
  const [open, setOpen] = useState(false);
  if (isNil(source) || picture.isError) return null;
  if (isNil(url))
    return (
      <div ref={ref} className={PANEL} aria-hidden="true">
        <Bone className="absolute inset-3 size-auto animate-pulse rounded-lg" />
      </div>
    );
  return (
    <>
      <button
        type="button"
        className={cn(
          PANEL,
          'cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-4'
        )}
        aria-label={`Open the picture of ${entity.name} full size`}
        onClick={() => setOpen(true)}
      >
        <img
          src={url}
          alt=""
          className="pointer-events-none absolute inset-0 size-full object-contain p-2.5 transition-transform duration-300 ease-out group-hover/picture:scale-[1.04]"
        />
        <span className="pointer-events-none absolute right-2 bottom-2 grid size-7 place-items-center rounded-full bg-white/95 text-primary-9 opacity-0 shadow-block-btn transition-opacity duration-150 group-hover/picture:opacity-100 group-focus-visible/picture:opacity-100">
          <Icon name="search" size={14} stroke={2.2} />
        </span>
      </button>
      <Image
        src={url}
        alt={`Picture of ${entity.name}`}
        wrapperStyle={{ display: 'none' }}
        preview={{
          visible: open,
          onVisibleChange: setOpen,
          rootClassName: cn(
            '[&_.ant-image-preview-mask]:bg-black/80',
            '[&_.ant-image-preview-img]:bg-white [&_.ant-image-preview-img]:rounded',
            '[&_.ant-image-preview-img]:border-8 [&_.ant-image-preview-img]:border-white'
          ),
        }}
      />
    </>
  );
}
