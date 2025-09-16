import { useParams } from 'next/navigation';
import { useAtomValue } from 'jotai';
import { useCallback } from 'react';
import Link from 'next/link';

import BookmarkButton, { DetailViewBookmarkButton } from '@/features/bookmark/control';
import sessionAtom from '@/state/session';

import { DetailViewCopyButton } from '@/features/details-view/button-copy-id/button-copy-id';
import { getEntityBySlug } from '@/entity-configuration/domain/helpers';
import { DownloadSimpleThin } from '@/components/icons/EditorIcons';
import { ToolbarButton } from '@/components/buttons/toolbar';
import { resolveExperimentUrl } from '@/utils/url-builder';
import { BrainIcon } from '@/components/icons';
import { ensureArray } from '@/utils/array';

import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { EntitySlugValue } from '@/entity-configuration/domain/slug';
import { tempCheckCircuitInDev } from '@/temp-circuit-check';

export default function Header<T extends EntityCoreIdentifiableNamed>({
  detail,
  onDownload,
}: {
  detail: T;
  onDownload?: (entity: T) => void;
}) {
  const session = useAtomValue(sessionAtom);
  const { virtualLabId, projectId, type, id } = useParams<{
    virtualLabId?: string;
    projectId?: string;
    type: EntitySlugValue;
    id: string;
  }>();

  const tempType = tempCheckCircuitInDev(type);

  const entity = getEntityBySlug({ slug: tempType });
  const withinWorkspace = virtualLabId && projectId;
  const handleDownload = useCallback(() => onDownload?.(detail), [detail, onDownload]);

  return (
    <div className="text-primary-7 flex flex-col">
      <div className="text font-thin">Name</div>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-5">
          <div className="col-span-3 text-2xl font-bold">{detail?.name}</div>
        </div>
        {session && entity && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {entity.isCopyable && <DetailViewCopyButton id={detail.id} />}
            {entity.isSimulatable && withinWorkspace && (
              <Link
                href={resolveExperimentUrl({
                  ctx: { virtualLabId, projectId },
                  dataType: entity.type,
                  entityId: id,
                })}
              >
                <ToolbarButton icon={<BrainIcon style={{ width: '21px', height: '21px' }} />}>
                  <div>Simulate</div>
                </ToolbarButton>
              </Link>
            )}
            {entity.isBookmarkable && withinWorkspace && (
              <BookmarkButton
                virtualLabId={virtualLabId}
                entityId={detail.id}
                projectId={projectId}
                resourceId={ensureArray({ input: detail.legacy_id }).at(0)!}
                type={entity.type}
                customButton={DetailViewBookmarkButton}
              />
            )}
            {entity.isDownloadable && (
              <button
                type="button"
                title="Download"
                disabled={!onDownload}
                onClick={handleDownload}
              >
                <ToolbarButton icon={<DownloadSimpleThin className="text-[21px]" />}>
                  Download
                </ToolbarButton>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
