'use client';

import { RightOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import { Button } from '@/ui/molecules/button';
import DescriptionSection from '@/ui/segments/reports/obi-showcases/description';
import { cn } from '@/utils/css-class';

import type { SanityShowcaseType } from '@/ui/segments/reports/obi-showcases/types';

const SECTIONS = [
  { key: 'description', title: 'Description', url: 'description' },
  { key: 'artifacts', title: 'Artifacts', url: 'artifacts' },
  { key: 'notebooks', title: 'Notebooks', url: 'notebooks' },
] as const;

export default function ShowcaseDetailContent({ project }: { project: SanityShowcaseType }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSection = searchParams.get('section') ?? 'description';

  let activeSectionContent: React.ReactNode;
  switch (activeSection) {
    case 'description':
      activeSectionContent = <DescriptionSection content={project} />;
      break;
    case 'artifacts':
    case 'notebooks':
      activeSectionContent = (
        <div className="flex flex-col items-center justify-center gap-6 py-16 text-center border border-primary-7">
          <p className="text-xl text-white">To read more, please login</p>
          <button type="button" className="border border-white rounded-full px-12 py-5">
            <Link href="/app/virtual-lab" className="text-white font-bold font-sans text-3xl!">
              Login
            </Link>
          </button>
        </div>
      );
      break;
    default:
      activeSectionContent = <DescriptionSection content={project} />;
      break;
  }

  return (
    <div className="mx-auto grid min-h-[60vh] w-full py-56 grid-cols-1 gap-6 bg-primary-9 px-4 text-white md:grid-cols-[240px_1fr] lg:px-20">
      <aside className="flex flex-col gap-2">
        {SECTIONS.map(({ title, url }) => (
          <Button
            key={url}
            rounded
            borderless
            asChild
            variant="outline"
            className={cn(
              'h-auto w-full justify-start font-bold shadow-sm',
              activeSection === url
                ? 'border-0 bg-white text-primary-9'
                : 'border border-white bg-transparent text-white'
            )}
            size="lg"
          >
            <Link href={`${pathname}?section=${url}`}>
              {title}
              <RightOutlined className="ml-auto text-current" />
            </Link>
          </Button>
        ))}
      </aside>

      <main className="overflow-y-auto text-white [&_a]:text-white [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_li]:text-white [&_p]:text-white [&_span]:text-white [&_td]:text-white [&_th]:text-white">
        {activeSectionContent}
      </main>
    </div>
  );
}
