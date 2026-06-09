'use client';

import { capitalize } from 'es-toolkit/compat';
import { usePathname, useSearchParams } from 'next/navigation';

import Tab from '@/ui/molecules/tab';

import type { TDetailViewSectionDict } from '@/entity-configuration/definitions/types';

export default function DetailMenu({ sections }: { sections: TDetailViewSectionDict[] }) {
  const path = usePathname();
  const parentPath = path.split('/').slice(0, -1).join('/');
  const page = path.split('/').pop();
  const query = useSearchParams();

  return sections.map((s) => {
    const url = `${parentPath}/${s}?${query.toString()}`;
    return (
      <Tab key={s} highlight={page === s} href={url}>
        {capitalize(s.replaceAll('-', ' '))}
      </Tab>
    );
  });
}
