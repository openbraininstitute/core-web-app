'use client';

import { usePathname } from 'next/navigation';
import capitalize from 'es-toolkit/compat/capitalize';
import Tab from '@/ui/molecules/tab';
import { DetailViewSection } from '@/entity-configuration/definitions/types';

export default function DetailMenu({ sections }: { sections: DetailViewSection[] }) {
  const path = usePathname();
  const parentPath = path.split('/').slice(0, -1).join('/');
  const page = path.split('/').pop();

  return (
    <>
      {sections.map((s) => (
        <Tab key={s} highlight={page === s} href={`${parentPath}/${s}`}>
          {capitalize(s.replaceAll('-', ' '))}
        </Tab>
      ))}
    </>
  );
}
