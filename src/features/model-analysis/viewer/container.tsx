import { useMemo, useState } from 'react';
import { Collapse } from 'antd';
import dynamic from 'next/dynamic';

import { AllowedTypes } from '@/features/model-analysis/viewer/storage';

import type { IValidationConstructedResult } from '@/features/model-analysis/explorer/context';
import type { TAllowedTypes } from '@/features/model-analysis/viewer/storage';
import { Button } from '@/ui/molecules/button';

const Viewer = dynamic(() => import('@/features/model-analysis/viewer/viewer'), {
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

export function ViewerContainer({ validationResults }: Props) {
  const allowedValidationResults = validationResults?.filter((o) =>
    o.assets?.some((obj) => AllowedTypes.includes(obj.content_type as TAllowedTypes))
  );
  const allCount = allowedValidationResults?.reduce(
    (acc, item) =>
      acc +
      (item.assets?.filter((o) => AllowedTypes.includes(o.content_type as TAllowedTypes)).length ||
        0),
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
            count={
              item.assets?.filter((o) => AllowedTypes.includes(o.content_type as TAllowedTypes))
                .length || 0
            }
          />
        ),
      })) ?? []),
    ],
    [allCount, allowedValidationResults]
  );

  return (
    <div className="bg-neutral-1 h-full w-full">
      <div className="bg-neutral-1 sticky -top-10 z-10 flex flex-wrap gap-5">
        {tabs.map((t) => (
          <Button
            key={t.key}
            onClick={() => setType(t.key)}
            active={type === t.key}
            variant="outline"
          >
            {t.label}
          </Button>
        ))}
      </div>

      <div className="w-full">
        <div className="w-full min-w-full">
          {type === 'all' ? (
            <Collapse
              bordered={false}
              className="bg-white"
              items={allValidationResultsMap?.map(([{ id, name }, resultItem]) => ({
                key: `result-item-cls/${id}/${resultItem.id}`,
                label: (
                  <span className="text-primary-8">
                    {cleanTitle(name)}{' '}
                    <span className="text-neutral-4">
                      (
                      {resultItem.assets?.filter((o) =>
                        AllowedTypes.includes(o.content_type as TAllowedTypes)
                      ).length || 0}
                      )
                    </span>
                  </span>
                ),
                children: <Viewer validationResult={resultItem} key={resultItem.id} />,
              }))}
            />
          ) : (
            validationResults
              ?.filter((o) => o.id === type)
              ?.map((resultItem) => {
                return <Viewer validationResult={resultItem} key={resultItem.id} />;
              })
          )}
        </div>
      </div>
    </div>
  );
}
