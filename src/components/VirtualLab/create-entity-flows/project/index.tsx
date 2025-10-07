import reject from 'es-toolkit/compat/reject';

import { ExclamationCircleFilled } from '@ant-design/icons';
import Content from '@/components/VirtualLab/create-entity-flows/project/content';
import StepMenu from '@/components/VirtualLab/create-entity-flows/project/step-menu';
import { projectFlowSteps } from '@/components/VirtualLab/create-entity-flows/common/types';
import { tryCatch } from '@/api/utils';
import { getUserActiveSubscription } from '@/api/virtual-lab-svc/queries/subscription';
import { SubscriptionStatus } from '@/api/virtual-lab-svc/queries/types';

type Props = { virtualLabId: string };

export default async function Flow({ virtualLabId }: Props) {
  const { data, error } = await tryCatch(getUserActiveSubscription());
  if (error) {
    return (
      <div className="mb-6 transform rounded-xs bg-red-900 p-6 transition-all duration-500 hover:scale-[1.01] hover:shadow-xl">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h2 className="mb-2 text-2xl font-bold text-red-200">
              Unable to check for active subscription
            </h2>
            <p className="max-w-xl text-red-200/80">
              We encountered an error while checking your subscription status. This is required to
              determine if you can proceed to create a new project. Please try again later or
              contact support if the issue persists.
            </p>
          </div>
          <div className="mb-2 flex items-center gap-2 self-baseline">
            <ExclamationCircleFilled className="text-2xl text-yellow-400" />
            <span className="text-xl font-bold text-yellow-400">Error</span>
          </div>
        </div>
      </div>
    );
  }
  let steps = projectFlowSteps;
  if (
    !data ||
    data?.subscription.status !== SubscriptionStatus.ACTIVE ||
    data.subscription.type === 'free'
  ) {
    steps = reject(steps, { id: 'members' });
  }
  steps = virtualLabId ? reject(steps, { id: 'virtual-lab' }) : steps;

  return (
    <div className="flex min-h-screen w-full flex-col bg-white">
      <div className="mx-auto flex h-full w-full grow flex-col">
        <div className="flex h-full w-full grow flex-col">
          <StepMenu steps={steps} />
          <Content steps={steps} />
        </div>
      </div>
    </div>
  );
}
