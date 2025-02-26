import { motion } from 'framer-motion';

import plansData from './data.json';
import PlanCard from '@/components/VirtualLab/subscription-plans/plan-card';

type Props = {
  selectedPlan?: string;
  onSelectPlan: (id: string) => void;
};

export default function PlanSection({ selectedPlan, onSelectPlan }: Props) {
  return (
    <section className="mx-auto w-full max-w-7xl bg-white px-6 py-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {plansData.plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <PlanCard
              plan={plan}
              isSelected={selectedPlan === plan.id}
              onSelectPlan={onSelectPlan}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
