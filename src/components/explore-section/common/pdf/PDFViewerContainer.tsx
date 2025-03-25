import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { ConfigProvider, Select, Button } from 'antd';
import { PlusOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons';
import groupBy from 'lodash/groupBy';
import { AnalysisType, analysisTypes } from './types';
import EModelAnalysisLauncher from '@/components/explore-section/EModel/DetailView/EModelAnalysisLauncher';
import { useAnalyses } from '@/app/app/virtual-lab/(free)/explore/(content)/simulation-campaigns/shared';
import Link from '@/components/Link';

const DynamicPDFViewer = dynamic(() => import('./PDFViewer'), {
  ssr: false,
});

interface Props {
  distributions: { '@id': string; about: string }[];
}

export function PDFViewerContainer({ distributions }: Props) {
  const [type, setType] = useState<AnalysisType>('all');
  // const [analyses] = useAnalyses('EModel');
  // const [analysis, setAnalysis] = useState('');

  const currentDistributions = distributions.filter((d) => matchesType(d, type));

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  const onScroll = () => {
    setScrollPosition(scrollContainerRef.current?.scrollLeft || 0);
  };

  const scroll = (scrollOffset: number) => {
    scrollContainerRef.current?.scrollBy({
      top: 0,
      left: scrollOffset,
      behavior: 'smooth',
    });
  };

  const canScrollLeft = type === 'all' && scrollPosition > 0;
  const canScrollRight =
    type === 'all' &&
    scrollPosition <
      (scrollContainerRef.current?.scrollWidth ?? 0) -
        (scrollContainerRef.current?.clientWidth ?? 0) -
        5;

  return (
    <div className="w-full">
      <ConfigProvider
        theme={{
          token: {
            borderRadius: 0,
            colorBorder: '#003A8C',
            colorText: '#003A8C',
            colorTextQuaternary: '#003A8C',
          },
        }}
      >
        <div className="flex flex-wrap items-center justify-between pl-2">
          <div className="my-4 flex flex-wrap gap-x-10 gap-y-4">
            {analysisTypes.map((option) => (
              <button
                type="button"
                key={option}
                className={`cursor-pointer capitalize text-primary-8 focus:outline-none ${type === option ? 'font-bold' : ''}`}
                onClick={() => setType(option)}
              >
                {option}
                <span className="pl-1 text-neutral-4">
                  {distributions.filter((d) => matchesType(d, option)).length}
                </span>
              </button>
            ))}
          </div>

          {(canScrollLeft || canScrollRight) && (
            <div className="flex gap-2">
              <Button
                type="text"
                icon={<LeftOutlined className={!canScrollLeft ? 'text-neutral-4' : ''} />}
                disabled={!canScrollLeft}
                onClick={() => scroll(-300)}
              />
              <Button
                type="text"
                icon={<RightOutlined className={!canScrollRight ? 'text-neutral-4' : ''} />}
                disabled={!canScrollRight}
                onClick={() => scroll(300)}
              />
            </div>
          )}

          {/* <Link
            className="flex items-center gap-2 text-primary-9"
            href="/simulate/experiment-analysis?targetEntity=EModel"
            aria-label="Add analysis"
          >
            Add analysis
            <span className="flex h-8 w-8 items-center justify-center border">
              <PlusOutlined className="text-md" />
            </span>
          </Link> */}
        </div>

        <div ref={scrollContainerRef} onScroll={onScroll} className="w-full overflow-x-auto">
          <div className="flex gap-x-16" style={{ minWidth: 'min-content' }}>
            {Object.entries(groupedDistributions).map(([pdfType, groupedDistribution]) => (
              <div style={{ minWidth: '30%', flexGrow: 1 }} key={pdfType}>
                {groupedDistribution.map((dist) => {
                  return JSON.stringify(dist);
                  // return (
                  //   <DynamicPDFViewer
                  //     url={pdf.contentUrl}
                  //     type={index === 0 ? pdfType : undefined}
                  //     key={pdf.contentUrl}
                  //   />
                  // );
                })}
              </div>
            ))}
          </div>

          {/* <Select
              className="m-3 inline-block w-44"
              options={analyses.map((a) => ({
                label: a.name,
                value: a['@id'],
              }))}
              onChange={(value: string) => setAnalysis(value)}
            /> */}
        </div>

        {/* <EModelAnalysisLauncher analysis={analyses.find((a) => a['@id'] === analysis)} /> */}
      </ConfigProvider>
    </div>
  );
}

const matchesType = (distribution: { '@id': string; about: string }, type: AnalysisType) => {
  if (type === 'all') {
    return true;
  }

  const lowerCaseName = distribution.about.toLowerCase();

  return lowerCaseName.includes(type);
};

const nameToType = (name: string): AnalysisType => {
  const lowerCaseName = name.toLowerCase();

  return analysisTypes.find((fileTypeValue) =>
    lowerCaseName.endsWith(fileTypeValue.toLowerCase())
  )!;
};
