'use client';

import { capitalize } from 'es-toolkit/compat';
import { usePathname, useSearchParams } from 'next/navigation';
import type { TDetailViewSectionDict } from '@/entity-configuration/definitions/types';
import Tab from '@/ui/molecules/tab';

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
