'use client';

import Image from 'next/image';
import Link from 'next/link';

import { config } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';

import type { OBIShowcaseProjectType } from './types';

function formatAuthors(authorsList: OBIShowcaseProjectType['authorsList']): string {
  if (!authorsList || authorsList.length === 0) return 'Unknown authors';

  if (authorsList.length === 1) {
    const author = authorsList[0];
    return `${author.firstName} ${author.lastName}`;
  }

  if (authorsList.length === 2) {
    const author1 = authorsList[0];
    const author2 = authorsList[1];
    return `${author1.firstName} ${author1.lastName} & ${author2.firstName} ${author2.lastName}`;
  }

  const firstAuthor = authorsList[0];
  return `${firstAuthor.firstName} ${firstAuthor.lastName} et al.`;
}

export default function ShowcaseCard({ project }: { project: OBIShowcaseProjectType }) {
  const authors = formatAuthors(project.authorsList);

  const { virtualLabId, projectId } = useWorkspace();

  return (
    <Link
      href={`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/reports/obi-showcase/${project.slug}`}
      className="group relative w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-300 ease-in-out hover:scale-[0.98] hover:shadow-lg"
    >
      {/* Hero Image */}
      <div className="relative h-48 w-full overflow-hidden">
        <Image
          src={project.heroImage}
          alt={`Image of the showcase ${project.name}`}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      </div>

      <div className="p-6">
        <div className="mb-3 flex items-start justify-between">
          <h3 className="text-primary-9 line-clamp-2 text-4xl font-bold group-hover:text-blue-600">
            {project.name}
          </h3>
        </div>

        <p className="text-primary-9 line-clamp-3 leading-normal">{project.introduction}</p>

        <div className="relative my-4 h-px w-full bg-gray-200" />

        <div className="text-primary-9 flex items-center text-base">
          <span className="font-medium">Author(s):</span>
          <span className="ml-1">{authors}</span>
        </div>
      </div>
    </Link>
  );
}
