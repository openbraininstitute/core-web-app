'use client';

import Link from 'next/link';
import usePathname from '@/hooks/pathname';
import { classNames } from '@/util/utils';

export default function NotebookTabs({ vlabId, projectId }: { projectId: string; vlabId: string }) {
  const currentPath = usePathname();

  const notebooksPath = `/app/virtual-lab/lab/${vlabId}/project/${projectId}/notebooks`;

  const tabClassName = (highlighted: boolean) =>
    classNames(
      highlighted ? 'bg-white text-primary-9' : 'bg-primary-9 text-white',
      'border border-primary-8 p-5'
    );

  const isMember = currentPath.includes('member');

  return (
    <div className="-mt-[84px] ml-5 flex">
      <Link href={notebooksPath} className={tabClassName(!isMember)}>
        OBI Notebooks
      </Link>

      <Link className={tabClassName(isMember)} href={notebooksPath + '/member'}>
        Member Notebooks
      </Link>
    </div>
  );
}
