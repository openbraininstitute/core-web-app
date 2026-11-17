'use client';

import { PageHeader } from '../../../shared/page-header';
import { useListFilters } from './list-filters';
import { ProjectsGrid } from './projects-grid';

export function ProjectsList() {
  const { params, gridKey, controls } = useListFilters({
    scoped: true,
    placeholder: 'Search by name',
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader title="Projects" />
      {controls}
      <ProjectsGrid key={gridKey} fill params={params} />
    </div>
  );
}
