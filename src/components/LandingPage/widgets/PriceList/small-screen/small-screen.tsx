import React from 'react';

import PlanHeader from './plan-header';
import FeatureBloc from './FeatureBloc';
import { classNames } from '@/util/utils';
import { styleBlockFullWidth } from '@/components/LandingPage/styles';
import { useSanityContentForPricing } from '@/components/LandingPage/content/pricing';

import { ID_MENU } from '@/components/LandingPage/constants';
import styles from './small-screen.module.css';

export interface SmallScreenProps {
  className?: string;
}

export default function SmallScreen({ className }: SmallScreenProps) {
  const data = useSanityContentForPricing();
  const [currentPlanIndex, setCurrentPlanIndex] = React.useState(0);
  const [menuHeight, setMenuHeight] = React.useState(0);
  React.useEffect(() => {
    const menu = document.getElementById(ID_MENU);
    if (!menu) return;

    setMenuHeight(menu.clientHeight);
  }, []);
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
