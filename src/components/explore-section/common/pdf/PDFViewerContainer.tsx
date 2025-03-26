import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { ConfigProvider } from 'antd';

import { AnalysisType, analysisTypes, typeLabel } from './types';

const DynamicPDFViewer = dynamic(() => import('./PDFViewer'), {
  ssr: false,
});

type Distribution = { '@id': string; about: string };

interface Props {
  distributions: Distribution[];
}

export function PDFViewerContainer({ distributions }: Props) {
  const [type, setType] = useState<AnalysisType>('all');
  // const [analyses] = useAnalyses('EModel');
  // const [analysis, setAnalysis] = useState('');

  const currentDistributions = distributions.filter((d) => matchesType(d, type));

  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
                className={`cursor-pointer text-primary-8 focus:outline-none ${type === option ? 'font-bold' : ''}`}
                onClick={() => setType(option)}
              >
                {typeLabel(option)}
                <span className="pl-1 text-neutral-4">
                  {distributions.filter((d) => matchesType(d, option)).length}
                </span>
              </button>
            ))}
          </div>

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

        <div ref={scrollContainerRef} className="w-full overflow-x-auto">
          <div className="flex gap-x-16" style={{ minWidth: 'min-content' }}>
            <div style={{ minWidth: '30%', flexGrow: 1 }}>
              {currentDistributions.map((d) => {
                return <DynamicPDFViewer distribution={d} key={d['@id']} />;
              })}
            </div>
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
