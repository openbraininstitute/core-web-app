'use client';

import { RightOutlined } from '@ant-design/icons';
import { RiDownload2Line, RiFileList3Line } from '@remixicon/react';
import Link from 'next/link';

import { Button } from '@/ui/molecules/button';
import {
  ImportLeftSideTab,
  ImportMode,
  type TImportLeftSideTab,
  type TImportMode,
} from '@/ui/segments/contribute/flow-elements/constants';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

export interface IUploadFlowSidebarProps {
  currentTab: TImportLeftSideTab;
  /** omitted when Type/Options use `typeHref` / `optionsHref` only. */
  onTabChange?: (tab: TImportLeftSideTab) => void;
  mode: TImportMode | null;
  hasTypeSelected: boolean;
  /** when set, Type navigates here (single-artifact page) instead of switching tab. */
  typeHref?: string;
  /** when set, Options navigates here instead of switching tab. */
  optionsHref?: string;
  typeValueLabel?: string;
  optionsValueLabel?: string;
  bottomSlot?: ReactNode;
  suppressUploadTabActiveStyle?: boolean;
  onMultipleDownloadGuide?: () => void;
  onMultipleDownloadTemplate?: () => void;
  multipleImportDownloadsDisabled?: boolean;
}

function typeLabelClass(isActive: boolean) {
  return cn('text-primary-9', 'group-active:text-white!', {
    'font-bold text-white': isActive,
  });
}

export function UploadFlowSidebar({
  currentTab,
  onTabChange,
  mode,
  hasTypeSelected,
  typeHref,
  optionsHref,
  typeValueLabel,
  optionsValueLabel,
  bottomSlot,
  suppressUploadTabActiveStyle = false,
  onMultipleDownloadGuide,
  onMultipleDownloadTemplate,
  multipleImportDownloadsDisabled = false,
}: IUploadFlowSidebarProps) {
  const tabHighlight = !suppressUploadTabActiveStyle;
  const isTypeMenuActive = tabHighlight && currentTab === ImportLeftSideTab.Type;
  const isOptionsMenuActive = tabHighlight && currentTab === ImportLeftSideTab.Options;

  const typeRow = typeValueLabel ? (
    <span className="flex min-w-0 flex-1 items-center justify-between gap-2 pr-1">
      <span className={typeLabelClass(isTypeMenuActive)}>Type</span>
      <span className={cn('truncate text-sm font-bold', typeLabelClass(isTypeMenuActive))}>
        {typeValueLabel}
      </span>
    </span>
  ) : (
    <span
      className={cn('text-primary-9 flex-1 text-left', 'group-active:text-white!', {
        'font-bold text-white': isTypeMenuActive,
      })}
    >
      Type
    </span>
  );

  const optionsRow = optionsValueLabel ? (
    <span className="flex min-w-0 flex-1 items-center justify-between gap-2 pr-1">
      <span className={typeLabelClass(isOptionsMenuActive)}>Options</span>
      <span className={cn('truncate text-sm font-bold', typeLabelClass(isOptionsMenuActive))}>
        {optionsValueLabel}
      </span>
    </span>
  ) : (
    <span
      className={cn('text-primary-9 flex-1 text-left', 'group-active:text-white!', {
        'font-bold text-white': isOptionsMenuActive,
      })}
    >
      Options
    </span>
  );

  const typeChevron = (
    <RightOutlined
      className={cn('text-primary-9! shrink-0 [&>svg]:size-2.5!', {
        'rotate-90 text-white': isTypeMenuActive,
      })}
    />
  );

  const optionsChevron = (
    <RightOutlined
      className={cn('text-primary-9! shrink-0 [&>svg]:size-2.5!', {
        'rotate-90 text-white': isOptionsMenuActive,
      })}
    />
  );

  const typeButtonClass = cn('md:h-10 lg:h-12', 'w-full justify-between font-normal', 'group');

  const typeButton =
    typeHref != null && typeHref !== '' ? (
      <Button
        asChild
        rounded
        size="responsive"
        variant={isTypeMenuActive ? 'shadow' : 'outline'}
        className={typeButtonClass}
      >
        <Link href={typeHref} className="flex w-full items-center justify-between">
          {typeRow}
          {typeChevron}
        </Link>
      </Button>
    ) : (
      <Button
        rounded
        size="responsive"
        variant={isTypeMenuActive ? 'shadow' : 'outline'}
        onClick={() => onTabChange?.(ImportLeftSideTab.Type)}
        className={typeButtonClass}
      >
        {typeRow}
        {typeChevron}
      </Button>
    );

  const optionsButton =
    optionsHref != null && optionsHref !== '' && hasTypeSelected ? (
      <Button
        asChild
        rounded
        size="responsive"
        variant={isOptionsMenuActive ? 'shadow' : 'outline'}
        className={typeButtonClass}
      >
        <Link href={optionsHref} className="flex w-full items-center justify-between">
          {optionsRow}
          {optionsChevron}
        </Link>
      </Button>
    ) : optionsHref != null && optionsHref !== '' && !hasTypeSelected ? (
      <Button
        rounded
        size="responsive"
        variant={isOptionsMenuActive ? 'shadow' : 'outline'}
        className={typeButtonClass}
        disabled
      >
        {optionsRow}
        {optionsChevron}
      </Button>
    ) : (
      <Button
        rounded
        size="responsive"
        variant={isOptionsMenuActive ? 'shadow' : 'outline'}
        onClick={() => onTabChange?.(ImportLeftSideTab.Options)}
        className={typeButtonClass}
        disabled={!hasTypeSelected}
      >
        {optionsRow}
        {optionsChevron}
      </Button>
    );

  return (
    <div
      className={cn('px-4', bottomSlot != null && 'flex min-h-0 flex-1 flex-col overflow-y-auto')}
    >
      <div className="mb-5 flex w-full items-center justify-between pl-3">
        <h2 className="text-primary-9 text-lg font-bold">Upload data</h2>
      </div>
      <div className="flex w-full flex-col items-center justify-start gap-2">
        {typeButton}
        <div className="w-full">
          {optionsButton}
          {mode === ImportMode.Multiple && (
            <div className="flex w-full flex-col items-center justify-between gap-1.5 px-5 py-3">
              <Button
                rounded
                type="button"
                size="responsive"
                variant="ghost"
                className={cn('md:h-10 lg:h-12', 'w-full justify-between font-normal', 'group')}
                disabled={multipleImportDownloadsDisabled || onMultipleDownloadGuide == null}
                onClick={onMultipleDownloadGuide}
              >
                <span className={cn('text-primary-9 flex-1 text-left', 'group-active:text-white!')}>
                  Download guide
                </span>
                <RiFileList3Line />
              </Button>
              <Button
                rounded
                type="button"
                size="responsive"
                variant="ghost"
                className={cn('md:h-10 lg:h-12', 'w-full justify-between font-normal', 'group')}
                disabled={multipleImportDownloadsDisabled || onMultipleDownloadTemplate == null}
                onClick={onMultipleDownloadTemplate}
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
      {bottomSlot}
    </div>
  );
}
