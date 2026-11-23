import { isNil, isNotNil } from 'es-toolkit';
import { notFound } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { colourOf } from '@/features/logbook/blocks/colour';
import { Board } from '@/features/logbook/board/board';
import { BoardSkeleton } from '@/features/logbook/elements/skeletons';
import { useRoute } from '@/features/logbook/router';
import { extractInitials } from '@/util/slugify';

import type { IMe } from '@/features/logbook/types';

export function LogbookRoot() {
  const user = useSession().data?.user;
  const route = useRoute();
  if (isNil(route.project)) notFound();
  if (isNil(user?.id)) return <BoardSkeleton withLog={isNotNil(route.logId)} />;
  const name = user.name ?? user.email ?? user.id;
  const me: IMe = {
    userId: user.id,
    name,
    initials: extractInitials(name),
    colour: colourOf(user.id),
  };
  return <Board me={me} project={route.project} logId={route.logId} pageId={route.pageId} />;
}
