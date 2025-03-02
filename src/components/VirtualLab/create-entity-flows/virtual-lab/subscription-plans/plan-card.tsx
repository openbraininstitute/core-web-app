import React, { Fragment, useState } from 'react';
import { CheckOutlined, CheckCircleFilled } from '@ant-design/icons';
import { Popover } from 'antd';
import kebabCase from 'lodash/kebabCase';

import { classNames } from '@/util/utils';
import {
  ContentForPricingFeatureBloc,
  ContentForPricingPlan,
} from '@/components/LandingPage/content/pricing';

interface Props {
  plan: ContentForPricingPlan;
  features: ContentForPricingFeatureBloc[];
  isSelected?: boolean;
  onSelect: () => void;
}

export default function PlanCard({ plan, features, isSelected, onSelect }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasMonthlyPrice = plan.price.month && plan.price.month.length > 0;
  const hasYearlyPrice = plan.price.yearNormal && plan.price.yearNormal.length > 0;
  const monthlyPrice = hasMonthlyPrice ? plan.price.month[0] : null;
  const yearlyPrice = hasYearlyPrice ? plan.price.yearNormal[0] : null;
  const monthlyDiscount = plan.price.discount ? plan.price.discount[0] : null;
  const yearlyDiscount = plan.price.yearDiscount ? plan.price.yearDiscount[0] : null;

  const renderFeatureIcon = (planIds: string[]) => {
    if (planIds.includes(plan.id)) {
      return <CheckCircleFilled className="h-5 w-5 text-green-600" />;
    }
    return <CheckCircleFilled className="h-5 w-5 text-gray-500" />;
  };

  return (
    <div
      className={classNames(
        'relative flex min-h-[600px] flex-col rounded-lg border bg-gradient-to-br p-6 transition-all duration-300',
        isSelected
          ? 'scale-105 border-primary-8 from-primary-8/10 to-primary-8/5 shadow-lg'
          : 'border-gray-200 from-white to-gray-50 hover:border-primary-8/30'
      )}
    >
      {isSelected && (
        <div className="absolute -right-3 -top-3 flex h-10 w-10 scale-0 transform animate-scale-up items-center justify-center rounded-full bg-primary-8">
          <CheckOutlined className="text-lg text-white" />
        </div>
      )}

      <div className="flex-1">
        <h3 className="text-2xl font-bold text-primary-8">{plan.title}</h3>

        {(hasMonthlyPrice || hasYearlyPrice) && (
          <div className="space-y-2">
            {hasMonthlyPrice && (
              <div className="flex items-center space-x-2">
                <p className="text-gray-500 line-through">
                  {monthlyPrice?.currency} {monthlyPrice?.value}/month
                </p>
                {monthlyDiscount && (
                  <div className="flex items-center space-x-2">
                    <p className="text-lg font-bold text-blue-900">
                      {monthlyDiscount.currency} {monthlyDiscount.value}
                    </p>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                      Special launch price
                    </span>
                  </div>
                )}
              </div>
            )}

            {hasYearlyPrice && (
              <div className="flex items-center space-x-2">
                <p className="text-gray-500 line-through">
                  {yearlyPrice?.currency} {yearlyPrice?.value}/year
                </p>
                {yearlyDiscount && (
                  <div className="flex items-center space-x-2">
                    <p className="text-lg font-bold text-blue-900">
                      {yearlyDiscount.currency} {yearlyDiscount.value}
                    </p>
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                      Special launch price
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 space-y-2">
          {plan.notes.map((note) => (
            <p key={kebabCase(note)} className="text-sm text-gray-600">
              + {note}
            </p>
          ))}
        </div>
        <div className="my-4 h-px bg-gray-300" />
        <div className="space-y-6">
          {(isExpanded ? features : features.slice(0, 2)).map((category) => (
            <Fragment key={category.title}>
              <div
                className={classNames(
                  'space-y-3 transition-all duration-300',
                  isExpanded ? 'animate-fade-in' : ''
                )}
              >
                <h4 className="text-xs font-semibold uppercase text-gray-500">
                  {category.title}
                  {!category.available && (
                    <span className="ml-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                      Future release
                    </span>
                  )}
                </h4>
                <ul className="space-y-2">
                  {category.features.map((feature) => (
                    <li key={feature.title} className="flex items-center justify-between">
                      <span
                        className={classNames(
                          'text-base font-bold',
                          !category.available ? 'text-gray-700' : 'text-primary-8'
                        )}
                      >
                        {feature.title}
                      </span>
                      <Popover
                        placement="top"
                        trigger="hover"
                        overlayClassName={classNames(
                          '[&_.ant-popover-inner]:!p-0 [&_.ant-popover-inner]:!bg-primary-8 max-w-[260px]',
                          '[&_.ant-popover-arrow:before]:bg-primary-8'
                        )}
                        destroyTooltipOnHide
                        content={
                          feature.plans.find((p) => p.id === plan.id)?.tooltip && (
                            <div>
                              <p>{feature.plans.find((p) => p.id === plan.id)?.tooltip}</p>
                            </div>
                          )
                        }
                      >
                        <div className="flex items-center space-x-2">
                          {feature.plans.find((p) => p.id === plan.id)?.label && (
                            <span className="text-xs text-gray-500">
                              {feature.plans.find((p) => p.id === plan.id)?.label}
                            </span>
                          )}
                          {renderFeatureIcon(feature.plans.map((p) => p.id))}
                        </div>
                      </Popover>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="my-4 h-px bg-gray-300" />
            </Fragment>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <button
          type="button"
          aria-label={isExpanded ? 'Show less' : 'Show more'}
          onClick={() => setIsExpanded(!isExpanded)}
          className={classNames(
            'flex w-full items-center justify-center space-x-1 text-primary-8 hover:text-primary-8/80',
            'transition-transform duration-300 hover:scale-105',
            'mx-auto w-max rounded-full border px-5 py-2'
          )}
        >
          <span>{isExpanded ? 'Less details' : 'More details'}</span>
        </button>

        <button
          type="button"
          aria-label={plan.title === 'Premium' ? 'Contact us' : 'Select'}
          onClick={onSelect}
          className={classNames(
            'w-full transform rounded-md border px-4 py-2 transition-all duration-300 hover:scale-105',
            isSelected
              ? 'border-primary-8 bg-primary-8 text-white hover:bg-primary-8/90'
              : 'border-primary-8 bg-white text-primary-8 hover:bg-primary-8/5'
          )}
        >
          {plan.title === 'Premium' ? 'Contact us' : 'Select'}
        </button>
      </div>
    </div>
  );
}
