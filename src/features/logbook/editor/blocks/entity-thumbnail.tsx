import { useQuery } from '@tanstack/react-query';
import { Image } from 'antd';
import { isNil, isNotNil } from 'es-toolkit';
import { useState } from 'react';
import { useInView } from 'react-intersection-observer';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { DETAIL_PREVIEW_DPI, getPreviewBlob, isTransientThumbnailError } from '@/api/thumbnail-svc';
import { getEntityByCoreType } from '@/entity-configuration/domain/helpers';
import { Bone } from '@/features/logbook/elements/skeletons';
import { useObjectUrl } from '@/features/logbook/hooks/use-object-url';
import { ThumbnailFrom } from '@/features/logbook/types';
import { Icon } from '@/ui/molecules/icon';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { cn } from '@/utils/css-class';

import type { TEntityTypeDict } from '@/api/entitycore/types/entity-type';
import type { EntityCoreResource } from '@/api/entitycore/types/shared/global';
import type { IEntity, TThumbnailSource } from '@/features/logbook/types';
import type { WorkspaceContext } from '@/types/common';

// The same pictures the Data page's side panel shows, by the EntityCore type.
const DRAWN = new Set<string>([
  EntityTypeDict.CellMorphology,
  EntityTypeDict.ElectricalCellRecording,
  EntityTypeDict.IonChannelRecording,
  EntityTypeDict.Emodel,
  EntityTypeDict.Memodel,
]);
// The service draws a model's trace from the model itself; the others need their data file.
const DRAWN_WITHOUT_FILE = new Set<string>([EntityTypeDict.Emodel, EntityTypeDict.Memodel]);
const HELD: Readonly<Partial<Record<string, AssetLabel>>> = {
  [EntityTypeDict.Circuit]: AssetLabel.circuit_visualization,
  [EntityTypeDict.IonChannelModel]: AssetLabel.ion_channel_model_thumbnail,
  [EntityTypeDict.SimulatableExtracellularRecordingArray]: AssetLabel.electrode_array_image,
};

/** Null when the entity has no picture, so the card asks nothing and keeps no space for one. */
export function thumbnailSourceOf(entity: IEntity): TThumbnailSource | null {
  const { type, assets = [] } = entity;
  if (isNil(type)) return null;
  const label = HELD[type];
  if (isNotNil(label)) {
    const asset = assets.find((item) => item.label === label);
    return isNil(asset) ? null : { from: ThumbnailFrom.Asset, asset };
  }
  if (!DRAWN.has(type)) return null;
  if (DRAWN_WITHOUT_FILE.has(type)) return { from: ThumbnailFrom.Service };
  const extension = getEntityByCoreType({ type: type as TEntityTypeDict })?.asset?.extension;
  return assets.some((item) => item.content_type === extension)
    ? { from: ThumbnailFrom.Service }
    : null;
}

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

// The card's right edge, top to bottom, like a link preview: the text keeps its room.
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
  // Asked once the card nears the screen: a long page doesn't load every picture at open.
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: '200px' });
  const picture = useQuery({
    // The Data pages' key for the same picture, so a picture seen there is not asked again.
    queryKey: keyBuilder.preview(project, {
      entityId: entity.id,
      dpi: source?.from === ThumbnailFrom.Service ? DETAIL_PREVIEW_DPI : undefined,
      target: source?.from === ThumbnailFrom.Asset ? 'assetLabel' : undefined,
    }),
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
    // A picture never changes once made; only a picture still being made is asked again.
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
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
      {/* A button: the keyboard reaches it, and the editor leaves a click on a button alone. */}
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
      {/* Only the lightbox, as in antd's "preview from a button" pattern. No classes are shared
          with it: antd hands an Image's rootClassName to its lightbox too. */}
      <Image
        src={url}
        alt={`Picture of ${entity.name}`}
        wrapperStyle={{ display: 'none' }}
        preview={{
          visible: open,
          onVisibleChange: setOpen,
          // White on the zoomed image itself: zoom and rotate transform that element. A darker
          // backdrop: the page's text showed through behind the toolbar.
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
