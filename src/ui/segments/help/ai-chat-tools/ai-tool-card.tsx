import { AIChatToolsSectionProps } from '.';

import Slugify from '@/util/slugify';

export default function AIToolCard({ content }: { content: AIChatToolsSectionProps }) {
  return (
    <article
      key={content.name ?? content.id ?? `feature-${Math.random()}`}
      className="border-neutral-2 text-primary-9 flex w-2/3 flex-col border border-solid p-6"
      id={Slugify(content.name)}
    >
      <h2 className="text-primary-9 text-2xl font-bold">{content.name}</h2>
      <p className="text-[1.2em] leading-normal">{content.description}</p>
    </article>
  );
}
