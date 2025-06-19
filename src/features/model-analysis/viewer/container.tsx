import { useMemo, useState } from 'react';
import { Tabs, Collapse } from 'antd';
import dynamic from 'next/dynamic';

import { AllowedType } from '@/features/model-analysis/viewer/pdf-viewer';
import { classNames } from '@/util/utils';

import type { IValidationConstructedResult } from '@/features/model-analysis/explorer/context';

const DynamicPDFViewer = dynamic(() => import('@/features/model-analysis/viewer/pdf-viewer'), {
  ssr: false,
});

type Props = {
  validationResults: IValidationConstructedResult | null;
};

function cleanTitle(title: string): string {
  const blacklist = ['Simulatable', 'Validation', 'Neuron'];
  return title
    .split(' ')
    .filter((word) => !blacklist.includes(word))
    .join(' ');
}

function TabLabel({ title, count }: { title: string; count: number }) {
  return (
    <span>
      {title}
      <span style={{ marginLeft: 8, color: '#999' }}>({count})</span>
    </span>
  );
}

export function PDFViewerContainer({ validationResults }: Props) {
  const allowedValidationResults = validationResults?.filter((o) =>
    o.assets?.some((obj) => obj.content_type === AllowedType)
  );
  const allCount = allowedValidationResults?.reduce(
    (acc, item) => acc + (item.assets?.filter((o) => o.content_type === AllowedType).length || 0),
    0
  );
  const allValidationResultsMap = allowedValidationResults?.map((validationResult) => [
    { id: validationResult.id, name: validationResult.name },
    validationResult,
  ]) as Array<[{ id: string; name: string }, IValidationConstructedResult[number]]>;

  const [type, setType] = useState<string | undefined>(allowedValidationResults?.[0]?.id);
  const tabs = useMemo(
    () => [
      { key: 'all', label: <TabLabel title="All" count={allCount || 0} /> },
      ...(allowedValidationResults?.map((item) => ({
        key: item.id,
        label: (
          <TabLabel
            title={cleanTitle(item.name)}
            count={item.assets?.filter((o) => o.content_type === AllowedType).length || 0}
          />
        ),
      })) ?? []),
    ],
    [allCount, allowedValidationResults]
  );

  return (
    <div className="w-full">
      <div className="sticky -top-7 z-10 flex max-w-full flex-wrap items-center justify-between bg-white pl-2">
        <Tabs
          items={tabs}
          className={classNames('w-full max-w-full')}
          indicator={{ align: 'center' }}
          activeKey={type}
          onChange={setType}
        />
      </div>
      <div className="min-h-screen w-full">
        <div className="w-full min-w-full">
          {type === 'all' ? (
            <Collapse
              bordered={false}
              className="bg-white"
              items={allValidationResultsMap?.map(([{ id, name }, resultItem]) => ({
                key: `${id}`,
                label: (
                  <span className="text-primary-8">
                    {cleanTitle(name)}{' '}
                    <span className="text-neutral-4">
                      (
                      {resultItem.assets?.filter((o) => o.content_type === AllowedType).length || 0}
                      )
                    </span>
                  </span>
                ),
                children: <DynamicPDFViewer validationResult={resultItem} key={resultItem.id} />,
              }))}
            />
          ) : (
            validationResults
              ?.filter((o) => o.id === type)
              ?.map((resultItem) => {
                return <DynamicPDFViewer validationResult={resultItem} key={resultItem.id} />;
              })
          )}
        </div>
      </div>
    </div>
  );
}
