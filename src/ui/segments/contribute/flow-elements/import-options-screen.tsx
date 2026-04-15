'use client';

import { CloseOutlined, PlusOutlined } from '@ant-design/icons';
import Link from 'next/link';
import plur from 'plur';

import Breadcrumb from '@/ui/molecules/breadcrumb';
import {
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/ui/molecules/breadcrumb/index';
import { Button } from '@/ui/molecules/button';
import { Card, CardContent, CardDescription, CardTitle } from '@/ui/molecules/card';
import { ImportMode } from '@/ui/segments/contribute/flow-elements/constants';
import { cn } from '@/utils/css-class';

import type { TEntityByExtendedTypeConfig } from '@/entity-configuration/domain/helpers';
import type { TImportMode } from '@/ui/segments/contribute/flow-elements/constants';

export interface IImportOptionsScreenProps {
  selectedType: TEntityByExtendedTypeConfig;
  mode: TImportMode | null;
  onModeChange: (mode: TImportMode) => void;
  onUploadBreadcrumbClick: () => void;
  continueHref: string;
}

export function ImportOptionsScreen({
  selectedType,
  mode,
  onModeChange,
  onUploadBreadcrumbClick,
  continueHref,
}: IImportOptionsScreenProps) {
  const multipleEnabled = selectedType?.isMultipleContributeSupport === true;
  const multipleCardActive = mode === ImportMode.Multiple && multipleEnabled;

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-full flex-col">
        <div className="mb-5 flex w-full items-center justify-between">
          <Breadcrumb showChevron={false}>
            <BreadcrumbList className="select-none">
              <BreadcrumbItem
                onClick={onUploadBreadcrumbClick}
                className="text-primary-9 text-lg font-bold [&_a]:hover:text-primary-8! cursor-pointer  hover:font-medium!"
              >
                <div className="transition-colors hover:text-primary-8">Upload</div>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="[&_svg]:size-3!" />
              <BreadcrumbItem className="text-primary-9 text-lg font-bold [&_span]:hover:text-primary-8! hover:font-medium!">
                <div className="transition-colors hover:text-primary-8">{selectedType?.title}</div>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <button
            type="button"
            className={cn(
              'hover:bg-neutral-1 text-neutral-5 hover:text-primary-6 ',
              'flex items-center justify-center rounded-full p-2 hover:shadow-bnb'
            )}
          >
            <CloseOutlined />
          </button>
        </div>
        <Card className="flex w-full items-center justify-between">
          <CardContent
            className={cn('flex w-full cursor-pointer items-stretch justify-between gap-2.5')}
          >
            <Card
              className={cn('w-full border-none bg-white text-primary-9 shadow-md', {
                ' bg-primary-8 text-white': mode === ImportMode.Single,
                'hover:bg-gray-100': mode !== ImportMode.Single,
              })}
              onClick={() => {
                onModeChange(ImportMode.Single);
              }}
            >
              <CardContent>
                <CardTitle
                  className={cn('mb-10 text-xl', {
                    'font-black text-2xl': mode === ImportMode.Single,
                  })}
                >
                  Single {selectedType?.title.toLocaleLowerCase()}
                </CardTitle>
                <CardDescription>
                  Upload a single entry and complete a guided, step-by-step workflow tailored to
                  this entity. You will be prompted to provide all required information, including
                  metadata, classification, and relevant attributes, ensuring accuracy and
                  completeness throughout the process.
                </CardDescription>
              </CardContent>
            </Card>
            <Card
              aria-disabled={!multipleEnabled}
              className={cn('w-full border-none bg-white text-primary-9 shadow-md', {
                ' bg-primary-8 text-white': multipleCardActive,
                'cursor-not-allowed opacity-45': !multipleEnabled,
                'hover:bg-gray-200': multipleEnabled && !multipleCardActive,
              })}
              onClick={
                multipleEnabled
                  ? () => {
                      onModeChange(ImportMode.Multiple);
                    }
                  : undefined
              }
            >
              <CardContent>
                <CardTitle
                  className={cn('mb-10 text-xl', {
                    'font- text-2xl': multipleEnabled && multipleCardActive,
                  })}
                >
                  Multiple {plur(selectedType?.title.toLocaleLowerCase() ?? '')}
                </CardTitle>
                <CardDescription>
                  Upload multiple entries at once using a structured table or by importing a CSV
                  file. You can edit data directly within the interface, while built-in validation
                  and intelligent suggestions help ensure consistency, highlight errors, and
                  streamline bulk data submission.
                </CardDescription>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      </div>
      {mode === ImportMode.Multiple && multipleEnabled ? (
        <div className="mt-auto flex w-full items-center justify-end">
          <Button
            rounded
            asChild
            variant="success"
            type="button"
            className={cn(
              'relative h-12 min-w-45 overflow-hidden border border-white/20 px-6 font-semibold',
              'bg-linear-to-r from-green-600 via-green-700 to-green-700 bg-size-[200%_100%]',
              'transition-all duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-70',
              'hover:scale-[1.02] active:scale-[0.98]'
            )}
          >
            <Link href={continueHref} className="flex items-center justify-center gap-2">
              <div className="flex items-center justify-between gap-5">
                <span> Continue to upload (CSV or table)</span>
                <PlusOutlined className="ml-auto text-sm" />
              </div>
            </Link>
          </Button>
        </div>
      ) : mode === ImportMode.Single ? (
        <div className="mt-auto flex w-full items-center justify-end">
          <Button
            rounded
            asChild
            variant="success"
            type="button"
            className={cn(
              'relative h-12 min-w-45 overflow-hidden border border-white/20 px-6 font-semibold',
              'bg-linear-to-r from-green-600 via-green-700 to-green-700 bg-size-[200%_100%]',
              'transition-all duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-70',
              'hover:scale-[1.02] active:scale-[0.98]'
            )}
          >
            <Link href={continueHref} className="flex items-center justify-center gap-2">
              Continue to upload
            </Link>
          </Button>
        </div>
      ) : null}
    </div>
  );
}
