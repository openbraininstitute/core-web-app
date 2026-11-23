import { useQuery } from '@tanstack/react-query';
import { NodeViewWrapper } from '@tiptap/react';
import { isNil, isNotNil } from 'es-toolkit';
import { Suspense, useState } from 'react';
import { match } from 'ts-pattern';

import {
  coreTypeOf,
  entityConfigOf,
  entityQuery,
  routeOfType,
} from '@/features/logbook/api/entities';
import { lookOfType } from '@/features/logbook/editor/blocks/entity-look';
import { EntityThumbnail } from '@/features/logbook/editor/blocks/entity-thumbnail';
import { ViewerMessage } from '@/features/logbook/editor/blocks/viewer-3d/frame';
import { has3dView, Viewer3d } from '@/features/logbook/editor/blocks/viewers-3d';
import { Bone } from '@/features/logbook/elements/skeletons';
import { dateOf } from '@/features/logbook/helpers';
import { useEntityDetail, useEntityPicker, useLogContext } from '@/features/logbook/log/context';
import { DISMISSABLE_ATTRIBUTE } from '@/hooks/use-dismiss-on-outside-interaction';
import { Icon, isIconName } from '@/ui/molecules/icon';
import { cn } from '@/utils/css-class';

import type { NodeViewProps } from '@tiptap/react';

const ACTION =
  'grid size-8 flex-none place-items-center rounded-full border-0 bg-white shadow-block-btn transition-[box-shadow,translate] duration-150 hover:-translate-y-px hover:shadow-pop';

export function EntityView({ node, selected, updateAttributes, deleteNode }: NodeViewProps) {
  const { project } = useLogContext();
  const openPicker = useEntityPicker();
  // The picker is null wherever the page can't be edited; `editor.isEditable` would go stale here.
  const canEdit = isNotNil(openPicker);
  const type = String(node.attrs['type']);
  const entityId = String(node.attrs['entityId']);
  const label = String(node.attrs['label']);
  const look = lookOfType(type);
  const known = isNotNil(entityConfigOf(type)) || isNotNil(routeOfType(type));
  const entity = useQuery(entityQuery(type, entityId, project));
  const [open3d, setOpen3d] = useState(false);

  const region = entity.data?.brain_region?.name ?? (known ? null : 'Not in this catalogue');
  const species = entity.data?.subject?.species?.name;
  const by = entity.data?.created_by?.pref_label;
  const created = entity.data?.creation_date;
  const date = isNil(created) ? null : dateOf(created);
  const missing = entity.isError || !known;
  const viewable = has3dView(type);
  const openDetail = useEntityDetail();
  const hasDetail = isNotNil(openDetail) && isNotNil(coreTypeOf(type)) && !entity.isError;

  return (
    <NodeViewWrapper
      className="group/entity mx-0 mt-[10px] mb-[14px] overflow-hidden rounded-2xl border border-block-border bg-white text-primary-9"
      data-selected={selected}
      contentEditable={false}
    >
      <div className="flex flex-wrap items-start gap-3 px-4 py-[14px]">
        <span
          className="grid size-10 flex-none place-items-center rounded-xl"
          style={{ background: look.tint, color: look.colour }}
        >
          <Icon name={known && isIconName(type) ? type : 'cube'} size={20} stroke={1.8} />
        </span>
        <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex h-5 items-center rounded-full px-2 text-[11px] font-bold tracking-[0.04em] whitespace-nowrap uppercase"
              style={{ background: look.tint, color: look.colour }}
            >
              {look.label}
            </span>
            {isNil(region) ? null : (
              <span className="text-[12px] leading-[1.4] text-neutral-4">
                {[region, species].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
          <div className="text-[16px] leading-[1.3] font-bold">{entity.data?.name ?? label}</div>
          <div className="text-[12px] leading-[1.4] text-neutral-4">
            {match({ missing, error: entity.isError, pending: entity.isPending })
              .with({ missing: true, error: true }, () => 'Not found in this project, or no access')
              .with({ missing: true }, () => 'Shown with the generic card')
              .with({ pending: true }, () => <Bone className="my-[4px] h-2.5 w-40 animate-pulse" />)
              .otherwise(() => `Created by ${by ?? 'unknown'}${isNil(date) ? '' : ` · ${date}`}`)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'flex gap-1.5 opacity-0 transition-opacity duration-150 group-focus-within/entity:opacity-100 group-hover/entity:opacity-100 pointer-coarse:opacity-100',
              selected && 'opacity-100'
            )}
          >
            {hasDetail ? (
              <button
                type="button"
                className={cn(ACTION, 'text-primary-6')}
                aria-label={`Show details of ${label}`}
                title="Show details"
                // A launcher of the panel: pressing it swaps the entity instead of closing the panel.
                {...{ [DISMISSABLE_ATTRIBUTE]: '' }}
                onClick={() => openDetail?.({ type, entityId })}
              >
                <Icon name="arrowUpRight" size={15} stroke={2.2} />
              </button>
            ) : null}
            {canEdit ? (
              <>
                <button
                  type="button"
                  className={ACTION}
                  style={{ color: look.colour }}
                  aria-label={`Replace ${label}`}
                  title="Replace"
                  onClick={() =>
                    openPicker((picked) =>
                      updateAttributes({
                        type: picked.type,
                        entityId: picked.id,
                        label: picked.name,
                      })
                    )
                  }
                >
                  <Icon name="replace" size={15} stroke={2.2} />
                </button>
                <button
                  type="button"
                  className={cn(ACTION, 'text-destructive')}
                  aria-label={`Remove ${label} from the page`}
                  title="Remove"
                  onClick={() => deleteNode()}
                >
                  <Icon name="trash" size={15} stroke={2} />
                </button>
              </>
            ) : null}
          </div>
          {viewable && !entity.isError ? (
            <button
              type="button"
              className="inline-flex h-[34px] items-center gap-1.5 rounded-full border-0 px-[14px] text-[13px] font-bold text-white"
              aria-pressed={open3d}
              style={{ background: open3d ? 'var(--color-primary-9)' : look.colour }}
              onClick={() => setOpen3d((o) => !o)}
            >
              <Icon name="cube" size={14} />
              {open3d ? 'Close 3D' : 'View in 3D'}
            </button>
          ) : null}
        </div>
        {entity.isSuccess ? <EntityThumbnail entity={entity.data} project={project} /> : null}
      </div>
      {open3d && viewable ? (
        <Suspense fallback={<ViewerMessage text="Loading the 3D view…" />}>
          <Viewer3d type={type} entityId={entityId} project={project} />
        </Suspense>
      ) : null}
    </NodeViewWrapper>
  );
}
