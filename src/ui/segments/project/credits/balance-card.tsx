import { SwapOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';

import { useWorkspaceMembership } from '@/hooks/use-user-membership';
import { getVirtualLabAccountBalance } from '@/services/virtual-lab/labs';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { Card, CardContent } from '@/ui/molecules/card';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

import type { CreditsVariant } from '@/ui/segments/project/credits';

type Props = {
  onTransferCredits?: () => void;
  className?: string;
  variant?: CreditsVariant;
};

export function BalanceCard({ onTransferCredits, className, variant = 'dark' }: Props) {
  const { virtualLabId, projectId } = useWorkspace();

  const { data } = useQuery({
    queryKey: keyBuilder.accounting({ virtualLabId }),
    queryFn: () => getVirtualLabAccountBalance({ virtualLabId, includeProjects: true }),
  });
  const { isVirtualLabAdmin: isAdmin } = useWorkspaceMembership({ virtualLabId, projectId });
  const ProjectBalance = data?.data.projects?.find((p) => p.proj_id === projectId);
  const virtualLabBalance = data?.data?.balance ?? 0;

  const isLight = variant === 'light';
  const labelColor = isLight ? 'text-primary-9' : 'text-white';

  return (
    <Card
      shadowless
      className={cn(isLight && 'border-neutral-2 bg-[#f5f5f5] text-primary-9', className)}
    >
      <CardContent className="flex items-center justify-between">
        <div className="flex items-center justify-center gap-10">
          <div className={cn('flex flex-col gap-1.5', labelColor)}>
            <div className="font-light">Virtual lab credits</div>
            <div className="text-xl font-bold">{Math.floor(Number(virtualLabBalance) || 0)}</div>
          </div>
          <div className={cn('flex flex-col gap-1.5', labelColor)}>
            <div className="font-light">Project credits</div>
            <div className="text-xl font-bold">
              {Math.floor(Number(ProjectBalance?.balance) || 0)}
            </div>
          </div>
        </div>
        {isAdmin && (
          <Button
            rounded
            borderless
            className={cn(
              'group px-4 shadow-2xl select-none',
              isLight
                ? 'bg-primary-9 text-white hover:bg-primary-8 hover:text-white'
                : 'text-primary-9 hover:bg-primary-8 bg-white hover:border-white hover:text-white'
            )}
            size="md"
            variant="outline"
            onClick={onTransferCredits}
          >
            Transfer credits
            <SwapOutlined />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default BalanceCard;
