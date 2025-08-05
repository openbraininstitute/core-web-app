import { LoadingOutlined, WarningOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { match, P } from 'ts-pattern';
import { Tooltip } from 'antd';

import { getProjectAccountBalance } from '@/services/virtual-lab/projects';
import { useDefaultBreakpoint } from '@/ui/hooks/create-break-point';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { CoinsIcon } from '@/components/icons/buttons';
import { keyBuilder } from '@/ui/queries/workspace';
import { Badge } from '@/ui/molecules/badge';

export function Wallet() {
  const breakpoint = useDefaultBreakpoint();
  const { virtualLabId, projectId } = useWorkspace();

  const { data, isLoading, isError, isSuccess, error } = useQuery({
    queryKey: keyBuilder.wallet({ virtualLabId, projectId }),
    queryFn: () => getProjectAccountBalance({ virtualLabId, projectId }),
    select: (res) => res.balance,
  });

  const content = match({ isError, isLoading, isSuccess, data, error })
    .with({ isLoading: true }, () => <LoadingOutlined spin />)
    .with({ isError: true, error: P.select() }, (err) => (
      <Tooltip placement="topLeft" title={err?.message} arrow>
        <WarningOutlined />
      </Tooltip>
    ))
    .with({ isSuccess: true, data: P.select() }, (balance) => <>{balance}</>)
    .otherwise(() => null);

  return (
    <Badge
      rounded
      className="min-w-16 font-bold select-none"
      variant="outline"
      size={breakpoint === 'xl' ? 'lg' : 'md'}
    >
      <CoinsIcon />
      {content}
    </Badge>
  );
}
