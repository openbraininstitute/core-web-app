'use client';

import { usePathname } from 'next/navigation';
import Tab from '@/ui/molecules/tab';

export default function DetailMenu() {
  const path = usePathname();
  const parentPath = path.split('/').slice(0, -1).join('/');
  const page = path.split('/').pop();

  console.log(parentPath)

  return (
    <>
      <Tab highlight={page === 'overview'} href={`${parentPath}/overview`}>
        Overview
      </Tab>
      <Tab highlight={page === 'analysis'} href={`${parentPath}/analysis`}>
        Analysis
      </Tab>
      <Tab highlight={page === 'publications'} href={`${parentPath}/publications`}>
        Related Publications
      </Tab>
      <Tab highlight={page === 'artifacts'} href={`${parentPath}/artifacts`}>
        Related Artifacts
      </Tab>
    </>
  );
}
