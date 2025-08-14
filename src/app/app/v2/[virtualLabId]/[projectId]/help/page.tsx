import { HelpLayout } from '@/ui/layouts/help-layout';
import { HelpHeader } from '@/ui/segments/help/header';
import Sections from '@/ui/segments/help/sections';

export default function Page() {
  return (
    <HelpLayout>
      <HelpHeader />
      <Sections />
    </HelpLayout>
  );
}
