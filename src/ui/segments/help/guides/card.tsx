import { PortableText } from 'next-sanity';

import { GuideCardProps } from '@/api/sanity/help-guides-section/route';

import styles from './content.module.css';

export default function GuideCard({ content }: { content: GuideCardProps }) {
  return (
    <div className="text-primary-9 relative flex w-full flex-col rounded-lg border border-solid border-gray-300 p-8">
      <div className="mb-2 text-2xl font-bold">{content.title}</div>
      {/* <div className="text-lg leading-normal">Here is my description with full content</div>
       */}
      <div className={styles.content}>
        <PortableText value={content.content} />
      </div>
    </div>
  );
}
