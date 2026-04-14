import { LoadingOutlined } from '@ant-design/icons';

import { Button } from '@/ui/molecules/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

import { useBuildSynaptome } from './hooks';

import styles from './section-build-synaptome-button.module.css';

export interface SectionBuildSynaptomeButtonProps {
  className?: string;
  breakpoint: 'l' | 'mobile' | 'xl';
  active: boolean;
  sessionId: string;
}

export default function SectionBuildSynaptomeButton({
  className,
  breakpoint,
  active,
  sessionId,
}: SectionBuildSynaptomeButtonProps) {
  const { isPending, buildSynaptome } = useBuildSynaptome(sessionId);

  return (
    <div className={cn(className, styles.sectionBuildSynaptomeButton, 'mt-auto w-full')}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <Button
              rounded
              variant="success"
              size={breakpoint === 'l' ? 'md' : 'lg'}
              className={cn(
                'disabled:bg-neutral-2/40 disabled:text-label! w-full justify-center px-10 font-medium!'
              )}
              onClick={buildSynaptome}
              disabled={!active}
            >
              <div className="shrink-0 font-bold">Build synaptome</div>
              {isPending && <LoadingOutlined className="ml-2 text-white" />}
            </Button>
          </div>
        </TooltipTrigger>
        {!active && (
          <TooltipContent
            sideOffset={4}
            avoidCollisions
            collisionPadding={{ left: 25 }}
            arrowClassName="bg-primary-9"
          >
            <p className={cn('text-justify text-base')}>
              Please fill all the required information <br /> along with selecting me-model and
              configuring synapses
            </p>
          </TooltipContent>
        )}
      </Tooltip>
    </div>
  );
}
