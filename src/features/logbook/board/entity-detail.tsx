import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { isNil } from 'es-toolkit';
import { useState } from 'react';
import { match } from 'ts-pattern';

import { WorkspaceSection } from '@/constants';
import { coreTypeOf, entityQuery } from '@/features/logbook/api/entities';
import { PanelSkeleton } from '@/features/logbook/elements/skeletons';
import { MiniDetailViewRenderer } from '@/ui/segments/mini-detail-view';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { IEntityDetailProps } from '@/features/logbook/types';

export function EntityDetail({ target, project, narrow, onClose }: IEntityDetailProps) {
  const dataType = coreTypeOf(target.type);
  const record = useQuery({
    ...entityQuery(target.type, target.entityId, project),
    placeholderData: keepPreviousData,
  });
  const [shownType, setShownType] = useState(dataType);
  if (!record.isPlaceholderData && shownType !== dataType) setShownType(dataType);
  if (isNil(shownType)) return null;
  const panel = (
    <MiniDetailViewRenderer
      section={WorkspaceSection.Data}
      record={(record.data as EntityCoreObjectTypes | undefined) ?? null}
      dataType={shownType}
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
      {match(record)
        .with({ status: 'pending' }, () => <PanelSkeleton />)
        .with({ status: 'error' }, () => (
          <p className="logbook-card grid h-full place-items-center p-6 text-center text-[13px] text-neutral-4">
            This entity can't be shown here.
          </p>
        ))
        .otherwise(() => panel)}
    </aside>
  );
}
