// An entity card: the type's colours and icon, its name, region and author from
// EntityCore. A circuit opens a 3D view, loaded only when asked for.
import { useQuery } from '@tanstack/react-query';
import { NodeViewWrapper } from '@tiptap/react';
import { isNil, isNotNil } from 'es-toolkit';
import { lazy, Suspense, useState } from 'react';

import { entityQuery, routeOfType } from '@/features/logbook/api/entities';
import { EntityType, entityLookOf } from '@/features/logbook/blocks/kinds';
import { useLogContext } from '@/features/logbook/log/context';
import { Icon } from '@/features/logbook/ui/icons';

import type { NodeViewProps } from '@tiptap/react';

const CircuitView = lazy(() => import('@/features/logbook/editor/blocks/CircuitView'));

const dateOf = (iso: string | undefined): string | null =>
  isNil(iso)
    ? null
    : new Date(iso).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

export function EntityView({ node, selected }: NodeViewProps) {
  const { project } = useLogContext();
  const type = String(node.attrs['type']);
  const entityId = String(node.attrs['entityId']);
  const label = String(node.attrs['label']);
  const look = entityLookOf(type);
  const known = isNotNil(routeOfType(type));
  const entity = useQuery(entityQuery(type, entityId, project));
  const [open3d, setOpen3d] = useState(false);

  const region = entity.data?.brain_region?.name ?? (known ? null : 'Not in this catalogue');
  const species = entity.data?.subject?.species?.name;
  const by = entity.data?.created_by?.pref_label;
  const date = dateOf(entity.data?.creation_date);
  const missing = entity.isError || !known;

  return (
    <NodeViewWrapper
      className="mx-0 mt-[10px] mb-[14px] overflow-hidden rounded-2xl border border-block-border bg-white text-primary-9"
      data-selected={selected}
      contentEditable={false}
    >
      <div className="flex flex-wrap items-start gap-3 px-4 py-[14px]">
        <span
          className="grid size-10 flex-none place-items-center rounded-xl"
          style={{ background: look.tint, color: look.colour }}
        >
          <Icon name={known ? type : 'cube'} size={20} stroke={1.8} />
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
            {missing
              ? entity.isError
                ? 'Not found in this project, or no access'
                : 'Shown with the generic card'
              : entity.isPending
                ? 'Loading…'
                : `Created by ${by ?? 'unknown'}${isNil(date) ? '' : ` · ${date}`}`}
          </div>
        </div>
        <div className="flex gap-2">
          {type === EntityType.Circuit ? (
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
      </div>
      {open3d ? (
        <Suspense
          fallback={
            <div className="relative bg-[#0b1220] p-6 text-[13px] text-[#d9e2ef]">
              Loading the 3D view…
            </div>
          }
        >
          <CircuitView name={entity.data?.name ?? label} />
        </Suspense>
      ) : null}
    </NodeViewWrapper>
  );
}
