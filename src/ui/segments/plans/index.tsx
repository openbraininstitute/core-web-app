import { PlanV2 } from '@/api/sanity/pricing/planv2';
import PlanCard from '@/ui/segments/plans/card';

export default function Plans({ plans }: { plans: PlanV2[] }) {
  const fallbackOrder = ['Free', 'Pro', 'Enterprise', 'Education'];

  const sortedPlans = [...plans].sort((a, b) => {
    if (a.planOrder != null && b.planOrder != null) {
      return a.planOrder - b.planOrder;
    }
    if (a.planOrder != null) return -1;
    if (b.planOrder != null) return 1;

    const aIndex = fallbackOrder.indexOf(a.name);
    const bIndex = fallbackOrder.indexOf(b.name);

    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;
    return 0;
  });

  return (
    <div className="relative grid w-screen grid-cols-4 gap-3 px-16">
      {sortedPlans.map((plan) => (
        <PlanCard key={plan.name} plan={plan} />
      ))}
    </div>
  );
}
