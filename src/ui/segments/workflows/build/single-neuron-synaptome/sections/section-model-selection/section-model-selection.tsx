import { CheckCircleFilled, RightOutlined } from '@ant-design/icons';
import React from 'react';

import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import type { IMEModel } from '@/api/entitycore/types';

import styles from './section-model-selection.module.css';

export interface SectionModelSelectionProps {
  className?: string;
  breakpoint: 'l' | 'mobile' | 'xl';
  memodel?: IMEModel;
  active: boolean;
  onClick(): void;
}

export default function SectionModelSelection({
  className,
  breakpoint,
  memodel,
  active,
  onClick,
}: SectionModelSelectionProps) {
  return (
    <div className={cn(className, styles.sectionModelSelection)}>
      <Button
        rounded
        variant="outline"
        size={breakpoint === 'l' ? 'md' : 'lg'}
        className={cn('group w-full justify-start pr-2 shadow-md')}
        active={active}
        onClick={onClick}
      >
        <div className="flex w-full items-center justify-between gap-4 overflow-hidden">
          <div className="shrink-0 font-bold">ME-model</div>
          {memodel ? (
            <Tooltip>
              <TooltipTrigger>
                <div className="text-accent-light! flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden">
                  <CheckCircleFilled className="shrink-0 text-base" />
                  <div
                    title={memodel.name}
                    className="line-clamp-1 min-w-0 flex-1 truncate text-left"
                  >
                    {memodel.name}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent sideOffset={4} avoidCollisions arrowClassName="bg-primary-9">
                <p className={cn('text-justify text-base')}>{memodel.name}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="text-neutral-4 group-hover:text-label flex-1 self-end text-right text-sm leading-7 transition-all">
              Select ME-model
            </div>
          )}
          <RightOutlined
            className={cn('text-neutral-4 group-hover:text-label mr-2 transition-all', {
              '-rotate-180 text-white! group-hover:text-white': active,
            })}
          />
        </div>
      </Button>
    </div>
  );
}
