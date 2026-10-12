import { notFound } from 'next/navigation';

import { getLearnSettings } from '@/features/learn/learn-settings-actions';
import { HelpLayout } from '@/ui/layouts/help-layout';
import { HelpHeader } from '@/ui/segments/help/header';
import Sections from '@/ui/segments/help/sections';

export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  // behind its flag, as Learn is
  if (!(await getLearnSettings()).help) notFound();

  return (
    <HelpLayout>
      <HelpHeader />
      <Sections searchParams={searchParams} />
    </HelpLayout>
  );
}
