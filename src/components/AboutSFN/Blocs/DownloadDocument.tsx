'use client';

import { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';

import SingleDocumentDownloadCard from './SingleDocumentDownloadCard';

import { DOWNLOADABLE_DOCUMENTS } from '@/constants/about/about-content';
import { SingleDocumentProps } from '@/types/about/document-download';
import { classNames } from '@/util/utils';

export default function DownloadDocument({
  id,
  setActiveSection,
}: {
  id: string;
  setActiveSection: (section: string) => void;
}) {
  const { ref, inView } = useInView({
    threshold: 0.2,
  });

  useEffect(() => {
    if (inView) {
      setActiveSection(id);
    }
  }, [inView, id, setActiveSection]);

  return (
    <div
      className="relative flex w-full items-center justify-center px-8 py-8 md:min-h-screen md:snap-start md:px-[10vw] md:py-[14vh] xl:px-[12vw]"
      ref={ref}
      id={id}
    >
      <div
        className={classNames(
          'relative grid w-full grid-rows-1 gap-6 transition-opacity delay-300 duration-300 ease-linear md:grid-cols-3',
          inView ? 'opacity-100' : 'opacity-0'
        )}
      >
        {DOWNLOADABLE_DOCUMENTS.map((singleDocument: SingleDocumentProps, index: number) => (
          <SingleDocumentDownloadCard
            content={singleDocument}
            index={index}
            inView={inView}
            key={`download_card_${singleDocument.id}`}
          />
        ))}
      </div>
    </div>
  );
}
