import { useQuery } from '@tanstack/react-query';
import { isNil } from 'es-toolkit';

import { WorkspaceSection } from '@/constants';
import { coreTypeOf, entityQuery } from '@/features/logbook/api/entities';
import { MiniDetailViewRenderer } from '@/ui/segments/mini-detail-view';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { IProject } from '@/features/logbook/auth/session';
import type { IEntityTarget } from '@/features/logbook/log/context';

export interface IEntityDetailProps {
  readonly target: IEntityTarget;
  readonly project: IProject;
  readonly narrow: boolean;
  readonly onClose: () => void;
}

/** Core's mini detail view, light variant, beside the log (a drawer on narrow screens). */
export function EntityDetail({ target, project, narrow, onClose }: IEntityDetailProps) {
  const dataType = coreTypeOf(target.type);
  // Same cache entry as the card, so opening the panel costs no new request.
  const record = useQuery(entityQuery(target.type, target.entityId, project));
  if (isNil(dataType)) return null;
  const panel = (
    <MiniDetailViewRenderer
      section={WorkspaceSection.Data}
      record={(record.data as EntityCoreObjectTypes | undefined) ?? null}
      dataType={dataType}
      theme="light"
      onClose={onClose}
      dismissOnOutsideInteraction
      openDetailsInNewTab
    />
  );
  if (narrow)
    return (
      <>
        <button
          type="button"
          className="fixed inset-0 z-55 cursor-default border-0 bg-[rgba(0,16,38,0.32)]"
          aria-label="Close the details"
          onClick={onClose}
        />
        <aside
          className="fixed top-2 right-2 bottom-2 z-60 w-[min(420px,calc(100vw-16px))]"
          aria-label="Entity details"
        >
          {panel}
        </aside>
      </>
    );
  return (
    <aside
      className="flex min-h-0 w-[clamp(320px,30%,420px)] flex-none flex-col"
      aria-label="Entity details"
    >
      {record.isError || record.isPending ? (
        <p className="logbook-card grid h-full place-items-center p-6 text-center text-[13px] text-neutral-4">
          {record.isError ? "This entity can't be shown here." : 'Loading the details…'}
        </p>
      ) : (
        panel
      )}
    </aside>
  );
}
