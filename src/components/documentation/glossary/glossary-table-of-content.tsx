'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ContentForGlossaryItem } from '../type';

import Slugify from '@/util/slugify';
import { classNames } from '@/util/utils';

export default function GlossaryTableOfContent({ content }: { content: ContentForGlossaryItem[] }) {
  const { slug } = useParams();

  const contentDataType = content.filter((item: ContentForGlossaryItem) =>
    ['Experimental Data ', 'Model Data '].includes(item.Name)
  );

  const contentArtifactType = content
    .filter(
      (item: ContentForGlossaryItem) => !['Experimental Data ', 'Model Data '].includes(item.Name)
    )
    .sort((a, b) => a.Name.localeCompare(b.Name));

  return (
    <div className="fixed z-50 h-screen w-[255px] overflow-y-auto">
      <div className="text-primary-3 mb-4 text-xl font-bold">Glossary</div>
      <div className="mb-7 flex flex-col">
        <div className="text-primary-3 after:bg-primary-6 mb-3 flex flex-row items-center text-sm font-normal tracking-wider whitespace-nowrap uppercase after:ml-2 after:block after:h-px after:w-full after:content-['']">
          Data types
        </div>
        <div className="flex flex-col gap-y-2">
          {contentDataType.map((item: ContentForGlossaryItem) => (
            <Link
              href={`/app/documentation/glossary/${Slugify(item.Name)}`}
              aria-label="Select glossary item"
              key={item.Name}
              className={classNames(
                'text-lg',
                slug === Slugify(item.Name) ? 'font-bold text-white' : 'text-primary-1 font-normal'
              )}
            >
              {item.Name}
            </Link>
          ))}
        </div>
      </div>
      <div className="mb-7 flex flex-col">
        <div className="text-primary-3 after:bg-primary-6 mb-3 flex flex-row items-center text-sm font-normal tracking-wider whitespace-nowrap uppercase after:ml-2 after:block after:h-px after:w-full after:content-['']">
          Artifact types
        </div>
        <div className="flex flex-col gap-y-2">
          {contentArtifactType.map((item: ContentForGlossaryItem) => (
            <Link
              href={`/app/documentation/glossary/${Slugify(item.Name)}`}
              aria-label="Select glossary item"
              key={item.Name}
              className={classNames(
                'text-lg',
                slug === Slugify(item.Name) ? 'font-bold text-white' : 'text-primary-1 font-normal'
              )}
            >
              {item.Name}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex flex-col">
        <div className="text-primary-3 after:bg-primary-6 mb-3 flex flex-row items-center text-sm font-normal tracking-wider whitespace-nowrap uppercase after:ml-2 after:block after:h-px after:w-full after:content-['']">
          Cell types
        </div>
        <div className="flex flex-col gap-y-2">
          <Link
            href="/app/documentation/glossary/cell-type/m-type"
            aria-label="Select glossary item "
            className={classNames(
              'text-lg',
              slug === 'm-type' ? 'font-bold text-white' : 'text-primary-1 font-normal'
            )}
          >
            Morphological types (m-types)
          </Link>
          <Link
            href="/app/documentation/glossary/cell-type/e-type"
            aria-label="Select glossary item "
            className={classNames(
              'text-lg',
              slug === 'e-type' ? 'font-bold text-white' : 'text-primary-1 font-normal'
            )}
          >
            Electrical types (e-types)
          </Link>
        </div>
      </div>
    </div>
  );
}
