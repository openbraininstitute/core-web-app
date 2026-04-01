'use client';

import { RightOutlined } from '@ant-design/icons';
import { RiDownload2Line, RiFileList3Line } from '@remixicon/react';

import { Button } from '@/ui/molecules/button';
import {
  ImportLeftSideTab,
  ImportMode,
  type TImportLeftSideTab,
  type TImportMode,
} from '@/ui/segments/contribute/flow-elements/constants';
import { cn } from '@/utils/css-class';

export interface IUploadFlowSidebarProps {
  currentTab: TImportLeftSideTab;
  onTabChange: (tab: TImportLeftSideTab) => void;
  mode: TImportMode | null;
  hasTypeSelected: boolean;
}

export function UploadFlowSidebar({
  currentTab,
  onTabChange,
  mode,
  hasTypeSelected,
}: IUploadFlowSidebarProps) {
  const isTypeMenuActive = currentTab === ImportLeftSideTab.Type;
  const isOptionsMenuActive = currentTab === ImportLeftSideTab.Options;

  return (
    <div className="px-4">
      <div className="mb-5 flex w-full items-center justify-between pl-3">
        <h2 className="text-primary-9 text-lg font-bold">Upload data</h2>
      </div>
      <div className="flex w-full flex-col items-center justify-start gap-2">
        <Button
          rounded
          size="responsive"
          variant={isTypeMenuActive ? 'shadow' : 'outline'}
          onClick={() => onTabChange(ImportLeftSideTab.Type)}
          className={cn('md:h-10 lg:h-12', 'w-full justify-between font-normal', 'group')}
        >
          <span
            className={cn('text-primary-9 flex-1 text-left', 'group-active:text-white!', {
              'font-bold text-white': isTypeMenuActive,
            })}
          >
            Type
          </span>
          <RightOutlined
            className={cn('text-primary-9! [&>svg]:size-2.5!', {
              'rotate-90 text-white': isTypeMenuActive,
            })}
          />
        </Button>
        <div className="w-full">
          <Button
            rounded
            size="responsive"
            variant={isOptionsMenuActive ? 'shadow' : 'outline'}
            onClick={() => onTabChange(ImportLeftSideTab.Options)}
            className={cn('md:h-10 lg:h-12', 'w-full justify-between font-normal', 'group')}
            disabled={!hasTypeSelected}
          >
            <span
              className={cn('text-primary-9 flex-1 text-left', 'group-active:text-white!', {
                'font-bold text-white': isOptionsMenuActive,
              })}
            >
              Options
            </span>
            <RightOutlined
              className={cn('text-primary-9! [&>svg]:size-2.5!', {
                'rotate-90 text-white': isOptionsMenuActive,
              })}
            />
          </Button>
          {mode === ImportMode.Multiple && (
            <div className="flex w-full flex-col items-center justify-between gap-1.5 px-5 py-3">
              <Button
                rounded
                size="responsive"
                variant="ghost"
                className={cn('md:h-10 lg:h-12', 'w-full justify-between font-normal', 'group')}
              >
                <span className={cn('text-primary-9 flex-1 text-left', 'group-active:text-white!')}>
                  Download guide
                </span>
                <RiFileList3Line />
              </Button>
              <Button
                rounded
                size="responsive"
                variant="ghost"
                className={cn('md:h-10 lg:h-12', 'w-full justify-between font-normal', 'group')}
              >
                <span className={cn('text-primary-9 flex-1 text-left', 'group-active:text-white!')}>
                  Download template
                </span>
                <RiDownload2Line />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
