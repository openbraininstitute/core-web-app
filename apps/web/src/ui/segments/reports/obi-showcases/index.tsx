'use client';

import { useSanity } from '@/services/sanity';
import ShowcaseCard from '@/ui/segments/reports/obi-showcases/obi-showcase-card';

import query from './query';
import { isOBIShowcaseProjectProps, type OBIShowcaseProjectType } from './types';

export default function OBIShowcasesPage() {
  const projects = useSanity(query, isOBIShowcaseProjectProps) as
    | OBIShowcaseProjectType[]
    | undefined;

  if (!projects || projects.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">No showcase projects available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">OBI Showcases</h1>
        <p className="mt-2 text-gray-600">
          Explore public projects and research showcases from the Open Brain Initiative community.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project: OBIShowcaseProjectType) => (
          <ShowcaseCard key={project.slug} project={project} />
        ))}
      </div>
    </div>
  );
}
