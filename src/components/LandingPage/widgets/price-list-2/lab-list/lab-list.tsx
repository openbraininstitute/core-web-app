import React from 'react';

import { ContentForPriceList2LabBlocSectionPlanItem, ContentForPriceList2LabItem } from '../hooks';
import SectionTitle from '../section-title';

import styles from './lab-list.module.css';

export interface LabListProps {
  value: ContentForPriceList2LabItem[];
  plans: Array<{ title: string; id: string }>;
}

export default function LabList({ value, plans }: LabListProps) {
  return (
    <>
      {value.map((section) => (
        <>
          <hr className={styles.fullWidth} />
          <SectionTitle className={styles.fullWidth} key={section.name}>
            {section.name}
          </SectionTitle>
          {section.list.map((bloc) => (
            <>
              <h3 className={styles.bloc} key={bloc.title}>
                {bloc.title}
              </h3>
              {plans.map((plan) => (
                <div className={styles.creditType} key={`${bloc.title}/${plan.id}`}>
                  {CREDIT_TYPE[bloc.type]}
                </div>
              ))}
              {bloc.items.map((feature) => (
                <>
                  <div key={`${feature.name}/${bloc.title}`}>{feature.name}</div>
                  {plans.map((plan) => (
                    <div key={`${feature.name}/${bloc.title}/${plan.id}`}>
                      {getPrice(feature.plans, plan.id)}
                    </div>
                  ))}
                </>
              ))}
            </>
          ))}
        </>
      ))}
    </>
  );
}

const CREDIT_TYPE: Record<string, React.ReactNode> = {
  currencyMonthMember: 'Currency / Month / Member',
  currency: 'Currency',
  craeditQuery: 'Credit / Query',
  creditBuild: 'Credit / Build',
  creditSimulation: 'Credit / Simulation',
};

function getPrice(
  plans: ContentForPriceList2LabBlocSectionPlanItem[],
  planId: string
): React.ReactNode {
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return null;

  return plan.cost;
}
