'use client';

import React from 'react';

import { styleBlockFullWidth } from '@/ui/segments/landing/styles';
import { useMenuHeight } from '@/ui/segments/landing/utils.client';
import { classNames } from '@/util/utils';

import FeatureBloc from './feature-bloc';
import PlanHeader from './plan-header';

import type { ContentForPricing } from '@/services/sanity/api/get-pricing-features';

import styles from './small-screen.module.css';

interface SmallScreenProps {
  className?: string;
  data: ContentForPricing | null;
}

export default function SmallScreen({ className, data }: SmallScreenProps) {
  const [currentPlanIndex, setCurrentPlanIndex] = React.useState(0);
  const menuHeight = useMenuHeight();
  if (!data) return null;

  const { plans, features } = data;
  const currentPlan = plans[currentPlanIndex];

  return (
    <div className={classNames(className, styles.smallScreen, styleBlockFullWidth)}>
      <header
        style={{
          '--custom-menu-height': `${menuHeight}px`,
        }}
      >
        {plans.map((plan, index) => (
          <button
            type="button"
            key={plan.id}
            disabled={index === currentPlanIndex}
            onClick={() => setCurrentPlanIndex(index)}
          >
            {plan.title}
          </button>
        ))}
      </header>
      <article className={styleBlockFullWidth}>
        <PlanHeader plan={currentPlan} />
        {features.map((bloc) => (
          <FeatureBloc key={bloc.title} bloc={bloc} plan={currentPlan} />
        ))}
      </article>
    </div>
  );
}
