'use client';

import ShowcaseCard from '@/app/showcases/ShowcaseCard';
import { useSanity } from '@/services/sanity';
import { styleBlockFullWidth } from '@/ui/segments/landing/styles';
import queryForOBIShowcases from '@/ui/segments/reports/obi-showcases/query';
import {
  isOBIShowcaseProjectProps,
  type OBIShowcaseProjectType,
} from '@/ui/segments/reports/obi-showcases/types';

export default function SectionShowcases() {
  const projects = useSanity(queryForOBIShowcases, isOBIShowcaseProjectProps) as
    | OBIShowcaseProjectType[]
    | undefined;

  if (!projects || projects.length === 0) {
    return (
      <div className={styleBlockFullWidth}>
        <div className="flex min-h-64 items-center justify-center px-4">
          <p className="text-gray-500">No showcase projects available at the moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styleBlockFullWidth}>
      <div className="w-full space-y-8 px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid w-full grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ShowcaseCard key={project.slug ?? project.name} project={project} />
          ))}
        </div>
      </div>
    </div>
  );
}
