import type { ReactNode } from 'react';

type Props = {
  left: ReactNode;
  middle: ReactNode;
  right: ReactNode;
  campaignId?: string;
};

export function ResultsLayout({ left, middle, right, campaignId }: Props) {
  const idBase = campaignId ? `scan-config-results-${campaignId}` : 'scan-config-results';
  const leftId = `${idBase}-left-column`;
  const middleId = `${idBase}-middle-column`;
  const rightId = `${idBase}-right-column`;

  return (
    <>
      <div
        id={leftId}
        className="border-r border-gray-200 pr-4 secondary-scrollbar flex w-full min-h-0 flex-1 flex-col items-center overflow-y-auto overflow-x-hidden"
      >
        {left}
      </div>
      <div
        id={middleId}
        className="relative border-r border-gray-200 secondary-scrollbar flex w-full min-h-0 flex-1 flex-col items-center overflow-y-auto overflow-x-hidden"
      >
        {middle}
      </div>
      <div
        id={rightId}
        className="relative secondary-scrollbar flex w-full min-h-0 flex-1 flex-col items-center overflow-y-auto overflow-x-hidden"
      >
        {right}
      </div>
    </>
  );
}
