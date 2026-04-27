'use client';

import publicationsData from '@/ui/segments/project/get-started/elements/publications-data.json';

type Publication = { year: number | string; html: string };

const PUBLICATIONS: Array<Publication> = publicationsData as Array<Publication>;

export function PublicationsView() {
  return (
    <div className="border-neutral-2 flex h-full max-h-[calc(100vh-18rem)] w-full flex-col gap-4 overflow-hidden rounded-2xl border bg-transparent p-6">
      <h1 className="text-primary-9 text-3xl font-bold">Publications</h1>
      <div className="relative flex w-full max-w-6xl flex-col gap-4 overflow-y-auto pr-2 pl-32">
        <span className="bg-neutral-2 absolute top-3 bottom-3 left-24 w-px" aria-hidden />
        {PUBLICATIONS.map((paper, index) => {
          const showYear = index === 0 || PUBLICATIONS[index - 1].year !== paper.year;
          return (
          <div key={`${paper.year}-${index}`} className="relative">
            {showYear && (
              <span className="text-primary-9 absolute top-5 -left-32 w-20 text-right text-xs font-semibold tracking-wide uppercase">
                {paper.year}
              </span>
            )}
            <span
              className="bg-primary-9 ring-background absolute top-6 -left-[1.875rem] size-3 rounded-full ring-4"
              aria-hidden
            />
            <article className="border-neutral-2 text-primary-9 flex w-full flex-col gap-2 rounded-xl border border-solid bg-white p-6">
              <div
                className="text-primary-9 [&_a]:text-primary-7 [&_a]:hover:underline text-base leading-relaxed"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted publication entries from upstream portal feed
                dangerouslySetInnerHTML={{ __html: paper.html }}
              />
            </article>
          </div>
          );
        })}
      </div>
    </div>
  );
}

export default PublicationsView;
