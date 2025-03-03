'use client';

import { motion } from 'framer-motion';

import PlanCard from '@/components/VirtualLab/create-entity-flows/subscription/plans/plan-card';
import PricingCardSkeleton from '@/components/VirtualLab/create-entity-flows/subscription/plans/skeleton';
import { PlansFooter } from '@/components/VirtualLab/create-entity-flows/subscription/footer';
import {
  ContentForPricingPlan,
  useSanityContentForPricing,
} from '@/components/LandingPage/content/pricing';

type Props = {
  selectedPlan?: ContentForPricingPlan | null;
  onSelectPlan: (plan: ContentForPricingPlan) => void;
  onCancel: () => void;
  onNextPayment: () => void;
};

export default function PlanSection({
  selectedPlan,
  onSelectPlan,
  onCancel,
  onNextPayment,
}: Props) {
  const data = useSanityContentForPricing();

  if (!data) return <PricingCardSkeleton />;
  return (
    <section className="flex h-full flex-grow flex-col">
      <div className="mx-auto w-full max-w-7xl bg-white p-6">
        <div className="grid grid-cols-1 gap-8 pt-6 md:grid-cols-2 lg:grid-cols-3">
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
                isSelected={selectedPlan?.id === plan.id}
                onSelect={() => onSelectPlan(plan)}
              />
            </motion.div>
          ))}
        </div>
      </div>
      <PlansFooter
        disableNextPayment={selectedPlan === null}
        onCancel={onCancel}
        onNextStep={onNextPayment}
      />
    </section>
  );
}
