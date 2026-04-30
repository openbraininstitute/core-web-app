import { SwapOutlined, WarningOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';

import { useWorkspaceMembership } from '@/hooks/use-user-membership';
import { getVirtualLabAccountBalance } from '@/services/virtual-lab/labs';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { Card, CardContent } from '@/ui/molecules/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

type Props = {
  onTransferCredits?: () => void;
};

export function BalanceCard({ onTransferCredits }: Props) {
  const { virtualLabId, projectId } = useWorkspace();

  const { data } = useQuery({
    queryKey: keyBuilder.accounting({ virtualLabId }),
    queryFn: () => getVirtualLabAccountBalance({ virtualLabId, includeProjects: true }),
  });
  const { isVirtualLabAdmin: isAdmin } = useWorkspaceMembership({ virtualLabId, projectId });
  const ProjectBalance = data?.data.projects?.find((p) => p.proj_id === projectId);
  const virtualLabBalance = data?.data?.balance ?? 0;

  return (
    <Card shadowless>
      <CardContent className="flex items-center justify-between">
        <div className="flex items-center justify-center gap-10">
          {isAdmin && (
            <div className="text-primary-9 flex flex-col gap-1.5">
              <div className="font-light">Virtual lab credits</div>
              <div className="text-xl font-bold">{virtualLabBalance}</div>
            </div>
          )}
          <div className="text-primary-9 flex flex-col gap-1.5">
            <div className="font-light">Project credits</div>
            <div className="text-xl font-bold">{ProjectBalance?.balance}</div>
          </div>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn({ 'cursor-not-allowed': !isAdmin })}>
              <Button
                rounded
                borderless
                className="text-primary-9 hover:bg-primary-8 not-disabled:shadow-2xl hover:border-white hover:text-white disabled:text-gray-500"
                size="md"
                variant="outline"
                onClick={isAdmin ? onTransferCredits : undefined}
                disabled={!isAdmin}
              >
                Transfer credits
                <SwapOutlined />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent
            avoidCollisions
            side="left"
            sideOffset={1}
            collisionPadding={{ bottom: 20 }}
            className="text-primary-8 max-w-[200px] bg-white text-base text-balance shadow-lg"
            arrowClassName="bg-white"
          >
            <WarningOutlined /> Only available to Virtual Lab admins
          </TooltipContent>
        </Tooltip>
      </CardContent>
    </Card>
  );
}

export default BalanceCard;
