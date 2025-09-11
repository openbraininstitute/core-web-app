// Modified Header Component
import { DownloadOutlined, SaveOutlined } from '@ant-design/icons';
import { useParams } from 'next/navigation';
import { ReactNode, useCallback } from 'react';
import { Button } from 'antd';
import { useAtomValue } from 'jotai';

import { ButtonEditMetadata } from './button-edit-metadata';
import { ButtonCopyId } from './button-copy-id';

import { getEntityBySlug } from '@/entity-configuration/domain/helpers';
import BookmarkButton from '@/features/bookmark/control';
import usePathname from '@/hooks/pathname';
import sessionAtom from '@/state/session';
import Link from '@/components/Link';
import { InteractiveViewIcon } from '@/components/icons';
import { ensureArray } from '@/utils/array';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { EntitySlugValue } from '@/entity-configuration/domain/slug';

export default function Header<T extends EntityCoreIdentifiableNamed>({
  detail,
  extraHeaderAction,
  onDownload,
  isEditing = false,
  onEditToggle,
  onSave,
}: {
  detail: T;
  extraHeaderAction?: ReactNode;
  onDownload?: (entity: T) => void;
  isEditing?: boolean;
  onEditToggle?: () => void;
  onSave?: () => void;
}) {
  const path = usePathname();
  const simCampMatch = path?.match(/\/explore\/simulation-campaigns\/[a-zA-Z0-9=]*/g);
  const isSimCampDetail = simCampMatch && path === simCampMatch[0];
  const session = useAtomValue(sessionAtom);

  const { virtualLabId, projectId, type, id } = useParams<{
    virtualLabId?: string;
    projectId?: string;
    type: EntitySlugValue;
    id: string;
  }>();

  const entity = getEntityBySlug({ slug: type });

  const handleDownload = useCallback(() => onDownload?.(detail), [detail, onDownload]);

  const handleEditToggle = useCallback(() => {
    onEditToggle?.();
  }, [onEditToggle]);

  return (
    <div className="text-primary-7 flex flex-col">
      <div className="text font-thin">Name</div>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-5">
          <div className="col-span-3 text-2xl font-bold">{detail?.name}</div>
        </div>
        {session && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Fix: Removed the 'value' prop as it's not a valid prop for ButtonEditMetadata. */}
            <ButtonEditMetadata isEditing={isEditing} onClick={handleEditToggle} />
            {isEditing && (
              <Button type="primary" className="flex items-center gap-2" onClick={onSave}>
                Save
                <SaveOutlined />
              </Button>
            )}
            <ButtonCopyId value={id} />
            {extraHeaderAction}
            {virtualLabId && projectId && entity?.isBookmarkable && (
              <BookmarkButton
                virtualLabId={virtualLabId}
                entityId={detail.id}
                projectId={projectId}
                resourceId={ensureArray({ input: detail.legacy_id }).at(0)!}
                type={entity.type}
              />
            )}
            <Button
              type="text"
              className="text-primary-7 flex items-center gap-2 hover:bg-transparent!"
              disabled={!onDownload || isEditing}
              onClick={handleDownload}
            >
              Download
              <DownloadOutlined className="border-neutral-2 border px-4 py-3" />
            </Button>
          </div>
        )}

        {isSimCampDetail && (
          <div className="flex gap-2">
            <Link href={`${path}/experiment-interactive`} className="flex items-center gap-2">
              Browse through interactive view
              <div className="border-neutral-4 text-primary-7 border p-2">
                <InteractiveViewIcon />
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
