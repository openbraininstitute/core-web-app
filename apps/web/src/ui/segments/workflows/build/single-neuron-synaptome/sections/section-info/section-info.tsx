import { RightOutlined, SettingFilled, WarningFilled } from '@ant-design/icons';
import React from 'react';

import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import styles from './section-info.module.css';

export interface SectionInfoProps {
  className?: string;
  breakpoint: 'l' | 'mobile' | 'xl';
  name?: string;
  active: boolean;
  onClick(): void;
}

export default function SectionInfo({
  className,
  breakpoint,
  name,
  active,
  onClick,
}: SectionInfoProps) {
  return (
    <div className={cn(className, styles.sectionInfo)}>
      <Button
        rounded
        variant="outline"
        size={breakpoint === 'l' ? 'md' : 'lg'}
        className={cn('group w-full justify-start pr-2! font-bold shadow-md')}
        active={active}
        onClick={onClick}
      >
        <div className="flex w-full items-center justify-between gap-2">
          <div>
            <SettingFilled
              className={cn('text-neutral-3 mr-2 group-hover:text-white', {
                'text-primary-4!': active,
              })}
            />
            <span className={styles.hoverFalse}>Info</span>
            <span className={styles.hoverTrue}>
              <strong>{name || 'Info'}</strong>
            </span>
          </div>
          <div className="flex items-center justify-center gap-3">
            {!name && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <WarningFilled className="text-sm text-yellow-300!" />
                  </span>
                </TooltipTrigger>
                <TooltipContent
                  avoidCollisions
                  side="bottom"
                  sideOffset={10}
                  collisionPadding={{ left: 25 }}
                  className="text-destructive! shadow-bnb max-w-2xs min-w-2xs rounded-md bg-amber-100! px-4 py-5 text-wrap"
                  arrowClassName="bg-amber-100"
                >
                  <p className="w-full pb-0.5 wrap-break-words hyphens-auto">
                    • The model name cannot be empty.
                  </p>
                  <p className="w-full pb-0.5 wrap-break-words hyphens-auto">
                    • Please enter a model name (minimum 1 character).
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
            <RightOutlined
              className={cn('text-neutral-4 mr-2 transition-all group-hover:text-white', {
                '-rotate-180 text-white!': active,
              })}
            />
          </div>
        </div>
      </Button>
    </div>
  );
}
