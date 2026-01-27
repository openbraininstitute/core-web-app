import { PortableText } from 'next-sanity';

import type { ContentForGlossaryItem } from '@/components/documentation/type';
import styles from '@/ui/segments/help/glossary/term-card.module.css';
import Slugify from '@/util/slugify';

export default function TermCard({
  content,
  sectionType,
}: {
  content: ContentForGlossaryItem;
  sectionType: string;
}) {
  return (
    <div
      className="border-neutral-2 text-primary-9 flex w-2/3 flex-col border border-solid p-6"
      id={Slugify(content.Name)}
    >
      <h2 className="text-primary-9 text-2xl font-bold">{content.Name}</h2>
      {sectionType !== 'cell' && (
        <>
          <div className="border-neutral-2 text-neutral-4 my-2 flex w-full flex-row gap-x-5 border-y border-solid py-2 text-lg">
            <div>Type: {content.Data_Type || 'N/A'}</div>
            <div>Status: {content.Status || 'N/A'}</div>
          </div>
          <div className={styles.definition}>
            {Array.isArray(content.definition) ? (
              <PortableText value={content.definition} />
            ) : (
              <p>{content.definition}</p>
            )}
          </div>
        </>
      )}
      {sectionType === 'cell' &&
        (Array.isArray(content.definition) ? (
          <div className={styles.definition}>
            <PortableText value={content.definition} />
          </div>
        ) : (
          <p className={styles.definition}>{content.definition}</p>
        ))}
    </div>
  );
}
