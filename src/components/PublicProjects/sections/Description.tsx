import { PortableText } from 'next-sanity';
import { ShowCaseProjectQueryType } from '../type';

import styles from '../style/portableText.module.css';

export default function DescriptionSection({ content }: { content: ShowCaseProjectQueryType }) {
  return (
    <div className="relative flex w-full flex-row flex-nowrap gap-x-12">
      <div className={styles.coreContent}>
        <PortableText value={content.description} />
      </div>
      <div className="w-1/2">
        <video controls className="h-auto w-full">
          <source src={content.presentationVideo.url} type="video/mp4" />
          <track default src={content.captionTrack} kind="captions" srcLang="en" label="English" />
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}
