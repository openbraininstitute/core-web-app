import type { ContentForFeatureItem } from '@/components/documentation/type';
import Slugify from '@/util/slugify';

export default function FeaturesCard({ item }: { item: ContentForFeatureItem }) {
  return (
    <article
      key={item.Feature_title ?? item.Topic ?? `feature-${Math.random()}`}
      className="border-neutral-2 text-primary-9 flex w-2/3 flex-col border border-solid p-6"
      id={Slugify(item.Feature_title)}
    >
      <h2 className="text-primary-9 text-2xl font-bold">{item.Feature_title}</h2>

      <div className="border-neutral-2 text-neutral-4 my-2 flex w-full flex-row gap-x-5 border-y border-solid py-2 text-lg">
        <div>Topic: {item.Topic || 'N/A'}</div>
        <div>Status: {item.Status || 'N/A'}</div>
      </div>
      <p className="text-[1.2em] leading-normal">{item.Description}</p>
    </article>
  );
}
