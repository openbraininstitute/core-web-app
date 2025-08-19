import { HelpLayout } from '@/ui/layouts/help-layout';
import { HelpHeader } from '@/ui/segments/help/header';
import Sections from '@/ui/segments/help/sections';

export const dynamic = 'force-dynamic';

export default function Page({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  return (
    <HelpLayout>
      <HelpHeader />
      <Sections searchParams={searchParams} />
    </HelpLayout>
  );
}
