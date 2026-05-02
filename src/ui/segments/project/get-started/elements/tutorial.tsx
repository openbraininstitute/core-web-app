'use client';

import { PlayCircleFilled, VideoCameraOutlined } from '@ant-design/icons';
import { lowerCase, upperFirst } from 'es-toolkit/compat';
import { useAtomValue } from 'jotai';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { ImageIcon } from '@/components/icons/image-states';
import { config } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { dataPreviewAtom } from '@/ui/segments/project/get-started/elements/data-preview-atom';
import { cn } from '@/utils/css-class';

import type { TTutorial } from '@/ui/segments/project/get-started/query';

export function TutorialCard({
  title,
  slug,
  isSelected,
}: {
  isSelected: boolean;
  title: string;
  slug: string;
}) {
  const { virtualLabId, projectId } = useWorkspace();
  const t = upperFirst(lowerCase(title));
  return (
    <Link
      href={`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/help/tutorials/${slug}`}
      className={cn(
        'bg-primary-9 group relative flex aspect-video w-full cursor-pointer select-none items-center justify-center overflow-hidden rounded-xl border-2 text-white transition-colors',
        isSelected ? 'border-primary-7' : 'border-transparent'
      )}
      title={t}
    >
      <span className="line-clamp-3 px-3 text-center text-sm font-semibold">{t}</span>
      <PlayCircleFilled
        aria-hidden
        className="text-white/80 group-hover:text-white! absolute right-2 bottom-2 text-base"
      />
    </Link>
  );
}

export function TutorialGrid({ tutorials }: { tutorials: Array<TTutorial> }) {
  const { slug } = useParams<{ slug: string }>();
  const preview = useAtomValue(dataPreviewAtom);

  return (
    <section id="tutorials-list" className="w-full flex flex-col">
      <div className="flex w-full gap-1.5 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tutorials.map((p) => (
          <div key={p.url} className="w-52 shrink-0 flex">
            <TutorialCard title={p.title} slug={p.slug} isSelected={!preview && slug === p.slug} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function EmptyTutorials() {
  return (
    <section id="discover-tutorials" className="w-full flex flex-col my-6">
      <h2 className="font-medium text-primary-9 px-2 mb-4">Discover</h2>
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-xl bg-white">
        <div className="flex items-center justify-center size-16 rounded-full bg-primary-8 mb-5">
          <VideoCameraOutlined className="text-white! text-2xl" />
        </div>
        <h3 className="text-primary-8 text-lg font-semibold mb-1.5">No tutorials available yet</h3>
        <p className="text-neutral-4 text-sm max-w-sm leading-relaxed">
          Video guides and walkthroughs will appear here as they are published. Stay tuned for new
          content to help you get the most out of the platform.
        </p>
      </div>
    </section>
  );
}
