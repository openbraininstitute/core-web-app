/* eslint-disable react/no-array-index-key */

import React from 'react';

import CenteredColumn from '@/components/LandingPage/components/CenteredColumn';
import SwipeableCardsList from '@/components/LandingPage/components/swipeable-cards-list/swipeable-cards-list';
import { useSanityContentForPricing } from '@/components/LandingPage/content/pricing';
import { styleBlockFullWidth } from '@/components/LandingPage/styles';
import { classNames } from '@/util/utils';

import FeatureBloc from './FeatureBloc';
import FeatureBlocSinglePlan from './FeatureBlocSinglePlan';
import PlanHeader from './PlanHeader';

import styles from './large-screen.module.css';

export default function LargeScreen() {
  const data = useSanityContentForPricing();

  if (!data) return null;

  const { plans, features } = data;

  return (
    <CenteredColumn className={styleBlockFullWidth}>
      {/* Desktop Grid Layout */}
      <div
        className={classNames(styles.priceList, styles.desktopLayout)}
        style={{ '--custom-plans-count': plans.length } as React.CSSProperties}
      >
        <div />
        {plans.map((plan, index) => (
          <PlanHeader key={`${plan.title}/${index}`} plan={plan} />
        ))}
        {features.map((bloc, index) => (
          <React.Fragment key={bloc.title ?? index}>
            {index > 0 && <hr className={styles.fullWidth} />}
            <FeatureBloc bloc={bloc} plans={plans} />
          </React.Fragment>
        ))}
      </div>

      {/* Mobile/Tablet Swipable Cards */}
      <div className={styles.mobileLayout}>
        <SwipeableCardsList hideFooter={false} className={styles.priceListCards}>
          {plans.map((plan, index) => (
            <div
              key={`${plan.title}/${index}`}
              className={classNames(styles.planCard, 'rounded-2xl border border-neutral-300')}
            >
              <h2 className={styles.cardTitle}>{plan.title}</h2>
              {plan.notes && plan.notes.length > 0 && (
                <div className={styles.cardSubtitle}>
                  {plan.notes.map((note, noteIndex) => (
                    <div key={noteIndex}>{note}</div>
                  ))}
                </div>
              )}
              <div className={styles.cardFeatures}>
                {features.map((bloc, blocIndex) => (
                  <React.Fragment key={bloc.title ?? blocIndex}>
                    {blocIndex > 0 && <hr className={styles.cardDivider} />}
                    <FeatureBlocSinglePlan bloc={bloc} plan={plan} />
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </SwipeableCardsList>
      </div>

      <ul className={styles.notesExplanation}>
        <li>*: Expires in 1 year, non-transferable</li>
        <li>**: Retained for 3 months after cancellation</li>
        <li>***: Published data & models</li>
      </ul>
    </CenteredColumn>
  );
}
