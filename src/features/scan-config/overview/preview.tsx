'use client';

import { RiCloseLine, RiExternalLinkLine } from '@remixicon/react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect } from 'react';

import { ViewVariant, WorkspaceSection } from '@/constants';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { MiniDetailViewRenderer } from '@/ui/segments/mini-detail-view';

import { entityHref, linkTypeOf, resolvedEntityQuery } from './cards';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { TPreviewRef } from './preview-context';

/**
 * An entity's mini-detail beside the canvas: what it is at a glance without leaving the
 * overview, with its full page a click away in a new tab. Escape closes it.
 */
export function PreviewDrawer({ preview, onClose }: { preview: TPreviewRef; onClose: () => void }) {
  const context = useWorkspace();
  const { data: resolved, isLoading } = useQuery(resolvedEntityQuery(context, preview));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <aside
      className="absolute inset-y-0 right-0 z-20 flex w-[420px] max-w-full flex-col border-l border-gray-200 bg-white shadow-xl"
      aria-label="Entity preview"
      data-testid="overview-preview"
    >
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-2.5">
        <span className="truncate text-sm font-semibold text-gray-800">
          {resolved?.entity.name ?? (isLoading ? 'Loading…' : 'Not available')}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {resolved && (
            <Link
              href={entityHref(context, resolved)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-primary-8 hover:bg-primary-0"
            >
              Open page <RiExternalLinkLine className="size-3.5" />
            </Link>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close the preview"
            className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
          >
            <RiCloseLine className="size-5" />
          </button>
        </div>
      </div>
      <div className="secondary-scrollbar min-h-0 flex-1 overflow-y-auto p-3">
        {resolved && (
          <MiniDetailViewRenderer
            section={WorkspaceSection.Data}
            record={resolved.entity as unknown as EntityCoreObjectTypes}
            dataType={linkTypeOf(resolved) ?? (resolved.entity.type as never)}
            theme={ViewVariant.Light}
            enableAnimation={false}
            openDetailsInNewTab
            hideUseModelAction
            bare
          />
        )}
      </div>
    </aside>
  );
}
