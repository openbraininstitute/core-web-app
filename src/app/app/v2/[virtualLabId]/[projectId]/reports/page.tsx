'use client';

import { parseAsString, useQueryState } from 'nuqs';
import { match } from 'ts-pattern';

import OBIShowcasesPage from '@/ui/segments/reports/obi-showcases';
import ShowcasesPage from '@/ui/segments/reports/showcases';
import SummariesPage from '@/ui/segments/reports/summaries';

export default function ReportsPage() {
  const [section] = useQueryState('section', parseAsString);

  return match(section)
    .with(null, () => <ShowcasesPage />)
    .with('showcases', () => <ShowcasesPage />)
    .with('summaries', () => <SummariesPage />)
    .with('obi-showcases', () => <OBIShowcasesPage />)
    .otherwise(() => <ShowcasesPage />);
}
