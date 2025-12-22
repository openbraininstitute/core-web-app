import { CheckCircleFilled, RightOutlined } from '@ant-design/icons';
import { ReactNode, useCallback } from 'react';

import renderMathInElement from 'katex/contrib/auto-render';

import { RenderErrorTooltip } from '@/ui/segments/workflows/build/ion-channel-build/elements/error-tooltip';
import { MenuButton } from '@/ui/segments/workflows/build/ion-channel-build/elements/menu-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

export function EquationMenuItem({
  groupBlock,
  propName,
  isActive,
  onClick,
  showErrorIcon,
  showValidIcon,
  label,
  description,
}: {
  groupBlock: string;
  propName: string;
  isActive: boolean;
  onClick: (propName: string) => void;
  showErrorIcon: boolean;
  showValidIcon: boolean;
  label: ReactNode;
  description: ReactNode;
}) {
  const renderLatex = useCallback((node: HTMLDivElement) => {
    renderMathInElement(node, {
      delimiters: [
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true },
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
      ],
      throwOnError: false,
    });
  }, []);

  if (groupBlock === 'Equations')
    return (
      <div className="w-full">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              rounded
              key={propName}
              variant={isActive ? 'shadow' : 'outline'}
              onClick={() => onClick(propName)}
              className={cn('md:h-10 lg:h-12', 'w-full justify-between font-normal', 'group')}
            >
              <span
                className={cn('text-primary-9 flex-1 text-left', 'group-active:text-white!', {
                  'font-bold text-white': isActive,
                })}
              >
                {label}
              </span>
              {/* eslint-disable-next-line no-nested-ternary */}
              {showErrorIcon ? (
                <RenderErrorTooltip isActive={isActive} />
              ) : showValidIcon ? (
                <CheckCircleFilled className="text-accent-dark text-lg" />
              ) : null}
              <RightOutlined
                className={cn('text-primary-9 [&>svg]:size-2.5!', {
                  'rotate-90 text-white': isActive,
                })}
              />
            </Button>
          </TooltipTrigger>

          <TooltipContent
            forceMount
            ref={(node) => {
              if (node) renderLatex(node);
            }}
            avoidCollisions
            side="bottom"
            sideOffset={0}
            className="max-w-64 text-wrap"
            arrowClassName="bg-primary-9"
          >
            {description}
          </TooltipContent>
        </Tooltip>
      </div>
    );

  return <MenuButton {...{ propName, isActive, onClick, showErrorIcon, showValidIcon, label }} />;
}
