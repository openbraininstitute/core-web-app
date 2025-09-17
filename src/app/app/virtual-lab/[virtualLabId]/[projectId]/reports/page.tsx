import { match } from 'ts-pattern';

import OBIShowcasesPage from '@/ui/segments/reports/obi-showcases';
import ShowcasesPage from '@/ui/segments/reports/showcases';
import SummariesPage from '@/ui/segments/reports/summaries';

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string | string[] }>;
}) {
  const params = await searchParams;
  const section = Array.isArray(params.section) ? params.section[0] : params.section || null;

  return match(section)
    .with(null, () => <ShowcasesPage />)
    .with('showcases', () => <ShowcasesPage />)
    .with('summaries', () => <SummariesPage />)
    .with('obi-showcases', () => <OBIShowcasesPage />)
    .otherwise(() => <ShowcasesPage />);
}
