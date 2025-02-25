import { motion } from 'framer-motion';
import { CheckOutlined } from '@ant-design/icons';
import kebabCase from 'lodash/kebabCase';

import PriceDisplay from '@/components/VirtualLab/subscription-plans/price-display';
import FeatureList from '@/components/VirtualLab/subscription-plans/feature-list';
import { classNames } from '@/util/utils';

interface Props {
  plan: any; // We would typically define a proper type here
  isSelected: boolean;
  onSelectPlan: (id: string) => void;
}

export default function PlanCard({ plan, isSelected, onSelectPlan }: Props) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className={classNames(
        'relative flex h-full flex-col rounded-lg border bg-white p-6',
        'border-gray-200 shadow-sm transition-all duration-200 hover:shadow-lg',
        isSelected ? 'border-2 border-primary-8' : 'border-gray-200'
      )}
      animate={{
        scale: isSelected ? 1.02 : 1,
        borderColor: isSelected ? '#003a8c' : '#E5E7EB',
        boxShadow: isSelected
          ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          : '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      }}
      transition={{ duration: 0.3 }}
    >
      {isSelected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className={classNames(
            'absolute -right-4 -top-3 h-10 w-10 rounded-full bg-primary-8 p-2 text-white shadow-lg',
            'flex items-center justify-center'
          )}
        >
          <CheckOutlined size={16} />
        </motion.div>
      )}
      <div className="mb-8">
        <h2 className="mb-2 text-3xl font-bold text-primary-8">{plan.name}</h2>
        {plan.description && <p className="text-sm text-gray-600">{plan.description}</p>}
      </div>
      <PriceDisplay plan={plan} />
      {plan.features.length > 0 && (
        <div className="mt-6 space-y-2">
          {plan.features.map((feature: string) => (
            <p key={`${plan.id}${kebabCase(feature)}`} className="text-sm text-gray-600">
              {feature}
            </p>
          ))}
        </div>
      )}
      <div className="my-4 h-px bg-gray-300" />
      {plan.categories && plan.categories.length > 0 && (
        <div className="flex-grow">
          {plan.categories.map((category: any) => (
            <>
              <div key={`${plan.id}${kebabCase(category)}`} className="mb-6">
                <h3 className="mb-4 text-xs font-semibold tracking-wider text-gray-500">
                  {category.name}
                </h3>
                <FeatureList features={category.features} />
              </div>
              <div className="my-4 h-px bg-gray-300" />
            </>
          ))}
        </div>
      )}
      <motion.button
        type="button"
        whileTap={{ scale: 0.95 }}
        onClick={() => onSelectPlan(plan.id)}
        className={classNames(
          'bg-navy-900 mt-auto w-full rounded-md px-4 py-3 font-medium text-primary-8',
          'border border-gray-200',
          'transition-colors duration-200',
          isSelected
            ? 'bg-primary-8 text-white hover:bg-primary-4'
            : 'bg-navy-900 hover:bg-navy-800 text-primary-8'
        )}
      >
        {isSelected ? 'Selected' : 'Select'}
      </motion.button>
    </motion.div>
  );
}
