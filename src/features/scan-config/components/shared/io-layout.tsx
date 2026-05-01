import { Collapse } from 'antd';

import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

type Props = {
  inputTitle?: string;
  outputTitle?: string;
  inputEmptyMessage?: string;
  outputEmptyMessage?: string;
  showOutput: boolean;
  inputIsEmpty: boolean;
  outputIsEmpty: boolean;
  inputItems: ReactNode;
  outputItems: ReactNode;
};

export function IoLayout({
  inputTitle = 'Inputs',
  outputTitle = 'Outputs',
  inputEmptyMessage = 'No input files available',
  outputEmptyMessage = 'No output files generated',
  showOutput,
  inputIsEmpty,
  outputIsEmpty,
  inputItems,
  outputItems,
}: Props) {
  const items = [
    {
      key: 'input',
      label: <h4 className="uppercase text-primary-9 cursor-default">{inputTitle}</h4>,
      showArrow: false,
      collapsible: 'disabled' as const,
      children: (
        <div className="mt-1 mb-2 flex flex-col gap-4">
          {inputIsEmpty && <div className="text-gray-400">{inputEmptyMessage}</div>}
          {inputItems}
        </div>
      ),
    },
    ...(showOutput
      ? [
          {
            key: 'output',
            label: <h4 className="uppercase text-primary-9 cursor-default">{outputTitle}</h4>,
            showArrow: false,
            collapsible: 'disabled' as const,
            children: (
              <div className="mt-1 mb-2 flex flex-col gap-4">
                {outputIsEmpty && <div className="text-gray-400">{outputEmptyMessage}</div>}
                {outputItems}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <Collapse
      ghost
      bordered={false}
      defaultActiveKey={['input', 'output']}
      items={items}
      className={cn(
        'bg-background [&_.ant-collapse-item]:border-0 [&_.ant-collapse-header]:bg-background ',
        '[&_.ant-collapse-item-disabled_.ant-collapse-header]:cursor-default! ',
        '[&_.ant-collapse-content]:border-t-0 [&_.ant-collapse-content]:bg-background',
        ' [&_.ant-collapse-content-box]:bg-background [&_.ant-collapse-content-box]:py-0!'
      )}
    />
  );
}
