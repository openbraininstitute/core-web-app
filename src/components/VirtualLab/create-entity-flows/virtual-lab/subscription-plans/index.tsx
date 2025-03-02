'use client';

import { motion } from 'framer-motion';

import PlanCard from '@/components/VirtualLab/create-entity-flows/virtual-lab/subscription-plans/plan-card';
import PricingCardSkeleton from '@/components/VirtualLab/create-entity-flows/virtual-lab/subscription-plans/skeleton';
import { PlansFooter } from '@/components/VirtualLab/create-entity-flows/virtual-lab/footer';
import { useSanityContentForPricing } from '@/components/LandingPage/content/pricing';

type Props = {
  selectedPlan: string | null;
  onSelectPlan: (id: string) => void;
  onCancel: () => void;
  onNextPayment: () => void;
};

export default function PlanSection({ selectedPlan, onSelectPlan, onCancel, onNextPayment }: Props) {
  const data = useSanityContentForPricing();

  if (!data) return <PricingCardSkeleton />;
  return (
    <section className="flex h-full flex-grow flex-col">
      <div className="mx-auto w-full max-w-7xl bg-white p-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 pt-6">
          {data?.plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <PlanCard
                key={plan.id}
                plan={plan}
                features={data.features}
                isSelected={selectedPlan === plan.id}
                onSelect={() => onSelectPlan(plan.id)}
              />
            </motion.div>
          ))}
        </div>
      </div>
      <PlansFooter disableNextPayment={selectedPlan === null} onCancel={onCancel} onNextStep={onNextPayment} />
    </section>
  );
}
