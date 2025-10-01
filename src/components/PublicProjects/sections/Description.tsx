import { PortableText } from 'next-sanity';
import { PresentationVideoProps, ShowCaseProjectQueryType } from '../type';

import PTGlossary, { PTGlossaryListProps } from '@/components/PublicProjects/Glossary';
import VideoBlock from '@/components/PublicProjects/VideoBlock';

import styles from '../style/portableText.module.css';

const components = {
  types: {
    glossaryList: ({ value }: { value: PTGlossaryListProps }) => <PTGlossary content={value} />,
  },
};

export default function DescriptionSection({ content }: { content: ShowCaseProjectQueryType }) {
  return (
    <div className="relative flex w-full flex-row flex-nowrap gap-x-12">
      <div className={styles.coreContent}>
        <PortableText value={content.description} components={components} />
      </div>
      <div className="flex w-1/2 flex-col gap-y-8">
        {content.videosList !== null &&
          content.videosList.map((video: PresentationVideoProps, index: number) => (
            <VideoBlock key={`Video of ${video.title}`} content={video} index={index} />
          ))}
      </div>
    </div>
  );
}
