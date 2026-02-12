import { SwapOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';

import { useWorkspaceMembership } from '@/hooks/use-user-membership';
import { getVirtualLabAccountBalance } from '@/services/virtual-lab/labs';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { Button } from '@/ui/molecules/button';
import { Card, CardContent } from '@/ui/molecules/card';
import { keyBuilder } from '@/ui/use-query-keys/workspace';

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
          <div className="text-primary-9 flex flex-col gap-1.5">
            <div className="font-light">Virtual lab credits</div>
            <div className="text-xl font-bold">{virtualLabBalance}</div>
          </div>
          <div className="text-primary-9 flex flex-col gap-1.5">
            <div className="font-light">Project credits</div>
            <div className="text-xl font-bold">{ProjectBalance?.balance}</div>
          </div>
        </div>
        {isAdmin && (
          <Button
            rounded
            borderless
            className="group text-primary-9 hover:bg-primary-8 bg-white px-4 shadow-2xl select-none hover:border-white hover:text-white"
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
