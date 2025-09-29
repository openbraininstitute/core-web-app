import { PortableText } from 'next-sanity';
import { PresentationVideoProps } from '../type';

import PTGlossary, { PTGlossaryListProps } from '../Glossary';
import VideoBlock from '../VideoBlock';

import { OBIShowcaseType } from '@/types/virtual-lab/obi-showcases';

import styles from '../style/portableText.module.css';

const components = {
  types: {
    glossaryList: ({ value }: { value: PTGlossaryListProps }) => <PTGlossary content={value} />,
  },
};

export default function DescriptionSection({ content }: { content: OBIShowcaseType }) {
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
