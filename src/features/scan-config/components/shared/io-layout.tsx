import { InfoCircleOutlined } from '@ant-design/icons';
import { Collapse } from 'antd';

import { MarkdownDescription } from '@/ui/molecules/markdown-description';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

const INPUT_FILES_TOOLTIP =
  'Input files to launch individual tasks/coordinates in a campaign. These include files such as the [obi-one](https://github.com/openbraininstitute/obi-one/) configuration, [SONATA](https://sonata-extension.readthedocs.io/en/latest/sonata_overview.html) circuit files and configurations (`simulation_config.json`, `node_sets.json`), etc.';
const OUTPUT_FILES_TOOLTIP =
  'The results generated after running a task such as the SONATA [reports](https://sonata-extension.readthedocs.io/en/latest/sonata_report.html) h5 (spikes and trace recordings) files, entities (such as Skeletonised morphologies, Extracted circuits, Ion channel model). The entities and files can be clicked for a preview.';

type InfoSectionLabelProps = {
  title: string;
  ariaLabel: string;
  description: string;
};

function InfoSectionLabel({ title, ariaLabel, description }: InfoSectionLabelProps) {
  return (
    <div className="flex items-center gap-2 font-semibold uppercase text-primary-9">
      <span>{title}</span>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={ariaLabel}
            className="inline-flex cursor-help items-center text-gray-400 transition-colors hover:text-primary-9 focus-visible:text-primary-9"
            onClick={(event) => event.stopPropagation()}
          >
            <InfoCircleOutlined className="text-xs" />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={5}
          className="z-50 max-w-80 rounded-md bg-white px-2 py-2 text-sm font-light text-primary-9 shadow-md"
          arrowClassName="bg-white"
        >
          <MarkdownDescription className="text-sm leading-5">{description}</MarkdownDescription>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

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
      label: (
        <InfoSectionLabel
          title={inputTitle}
          ariaLabel="More information about input files"
          description={INPUT_FILES_TOOLTIP}
        />
      ),
      showArrow: false,
      collapsible: 'disabled' as const,
      children: (
        <div className="mt-1 mb-2 flex flex-col gap-4" data-testid="scan-config-inputs">
          {inputIsEmpty && <div className="text-gray-400">{inputEmptyMessage}</div>}
          {inputItems}
        </div>
      ),
    },
    ...(showOutput
      ? [
          {
            key: 'output',
            label: (
              <InfoSectionLabel
                title={outputTitle}
                ariaLabel="More information about output files"
                description={OUTPUT_FILES_TOOLTIP}
              />
            ),
            showArrow: false,
            collapsible: 'disabled' as const,
            children: (
              <div className="mt-1 mb-2 flex flex-col gap-4" data-testid="scan-config-outputs">
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
