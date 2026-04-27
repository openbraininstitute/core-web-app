import { PortableText } from 'next-sanity';

import type { GuideCardProps } from '@/services/sanity';

import styles from './content.module.css';

export default function GuideCard({ content }: { content: GuideCardProps }) {
  return (
    <div className="border-neutral-2 text-primary-9 relative flex w-full flex-col rounded-xl border border-solid bg-white p-6">
      <div className="mb-2 text-2xl font-bold">{content.title}</div>
      {/* <div className="text-lg leading-normal">Here is my description with full content</div>
       */}
      <div className={styles.content}>
        <PortableText value={content.content} />
      </div>
    </div>
  );
}
