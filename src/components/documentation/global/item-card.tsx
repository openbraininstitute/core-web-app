import { PortableText } from 'next-sanity';
import Slugify from '@/util/slugify';
import type { ContentForGlossaryItem } from '../type';
import styles from './item-card.module.css';

export default function ItemCard({ content }: { content: ContentForGlossaryItem }) {
  return (
    <div
      className="border-primary-7 flex w-full flex-col border border-solid p-6"
      id={Slugify(content.Name)}
    >
      <h2 className="text-2xl font-bold text-white">{content.Name}</h2>
      <div className="border-primary-7 text-primary-2 my-2 flex w-full flex-row gap-x-5 border-y border-solid py-2 text-lg">
        <div>Type: {content.Data_Type || 'N/A'}</div>
        <div>Status: {content.Status || 'N/A'}</div>
      </div>
      <div className={styles.definition}>
        <PortableText value={content.definition} />
      </div>
    </div>
  );
}
