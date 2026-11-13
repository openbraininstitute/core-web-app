import { WarningOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { match, P } from 'ts-pattern';

import { CoinsIcon } from '@/components/icons/buttons';
import { config } from '@/config';
import { getProjectAccountBalance } from '@/services/virtual-lab/projects';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Badge } from '@/ui/molecules/badge';
import { Skeleton } from '@/ui/molecules/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

import type { ProjectBalance } from '@/types/accounting';

/** The project's credits; `plain`, as words and an icon in a toolbar rather than a pill. */
export function Wallet({ plain = false }: { plain?: boolean } = {}) {
  const breakpoint = useDefaultBreakpoint();
  const { virtualLabId, projectId } = useWorkspace();
  const { data, isLoading, isError, isSuccess, error } = useQuery({
    queryKey: keyBuilder.wallet({ virtualLabId, projectId }),
    queryFn: () => getProjectAccountBalance({ virtualLabId, projectId }),
    select: (res: ProjectBalance) => res.balance,
  });

  const content = match({
    isError,
    isLoading,
    isSuccess,
    data,
    error,
  })
    .with(
      P.when((s) => s.isLoading),
      () => <Skeleton className="h-5 w-14 rounded-full" />
    )
    .with({ isError: true, error: P.select() }, (err) => (
      <Tooltip>
        <TooltipTrigger asChild>
          <WarningOutlined />
        </TooltipTrigger>
        <TooltipContent side="bottom" showArrow={false} className="max-w-48 text-wrap">
          {err?.message}
        </TooltipContent>
      </Tooltip>
    ))
    .with({ isSuccess: true, data: P.select() }, (balance) => <>{balance}</>)
    .otherwise(() => null);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {plain ? (
          <Link
            prefetch
            id="workspace-project-credits"
            href={`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/credits`}
            aria-disabled={isLoading || isError}
            className="text-primary-9 flex h-10 shrink-0 items-center gap-2 rounded-xl px-3 font-bold select-none hover:bg-neutral-50 max-md:px-1.5"
          >
            {/* the number alone on a phone, whose bar has little room */}
            <span className="contents max-md:hidden">
              <CoinsIcon />
            </span>
            <span>{content}</span>
          </Link>
        ) : (
        <Badge
          asChild
          rounded
          id="workspace-project-credits"
          className="min-w-16 font-bold bg-background select-none hover:shadow-sm hover:bg-background"
          variant="outline"
          size={breakpoint === 'xl' ? 'lg' : 'md'}
          aria-disabled={isLoading || isError}
        >
          <Link
            prefetch
            href={`${config.ROOT_ROUTE}/${virtualLabId}/${projectId}/credits`}
            className="inline-block"
          >
            <CoinsIcon />
            <div className="ml-2">{content}</div>
          </Link>
        </Badge>
        )}
      </TooltipTrigger>
      <TooltipContent
        avoidCollisions
        side="bottom"
        sideOffset={1}
        collisionPadding={{ bottom: 20 }}
        className="text-primary-8 max-w-[200px] bg-white text-base text-balance shadow-lg"
        arrowClassName="bg-white"
      >
        <div className="font-bold">Project Credits</div>
        <p className="hyphens-auto">Credits transferred to this project from the virtual lab.</p>
      </TooltipContent>
    </Tooltip>
  );
}
