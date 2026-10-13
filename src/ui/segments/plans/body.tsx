import { RiCheckboxCircleFill, RiCloseCircleLine } from '@remixicon/react';

import { cn } from '@/utils/css-class';

import type { CostNameProps, PlanV2 } from '@/types/virtual-lab/pricing';

function FeatureIcon({ value }: { value: boolean }) {
  return value ? (
    <RiCheckboxCircleFill className="size-4 shrink-0 text-green-600" />
  ) : (
    <RiCloseCircleLine className="size-4 shrink-0 text-neutral-400" />
  );
}

function CostFeatureRow({
  feature,
  textColor,
  mutedColor,
  nameWidth,
  costWidth,
}: {
  feature: CostNameProps;
  textColor: string;
  mutedColor: string;
  nameWidth: string;
  costWidth: string;
}) {
  const subItems = feature.subItems ?? [];

  if (subItems.length === 0) {
    return (
      <div className="flex w-full flex-row items-baseline justify-between text-base leading-tight">
        <div className={cn(nameWidth, 'font-semibold', textColor)}>{feature.name}</div>
        <div className={cn(costWidth, 'text-right font-normal', mutedColor)}>{feature.cost}</div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex w-full flex-row items-baseline justify-between gap-2 text-base leading-tight">
        <div className={cn(nameWidth, 'font-semibold', textColor)}>{feature.name}</div>
        {feature.cost && (
          <div className={cn(costWidth, 'text-right font-normal', mutedColor)}>{feature.cost}</div>
        )}
      </div>
      <div className="flex flex-col gap-0.5 pl-4">
        {subItems.map((sub) => {
          const unavailable = sub.available === false;
          return (
            <div
              key={sub._key}
              className={cn(
                'flex w-full flex-row items-baseline justify-between gap-2 text-sm leading-tight',
                unavailable && 'opacity-40'
              )}
            >
              <div className={cn(nameWidth, 'font-normal', textColor)}>{sub.name}</div>
              <div className={cn(costWidth, 'text-right font-normal', mutedColor)}>
                {unavailable ? 'Coming soon' : sub.cost}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PlanBody({
  plan,
  isCurrentTier,
}: {
  plan: PlanV2;
  isCurrentTier?: boolean;
}) {
  const textColor = isCurrentTier ? 'text-white' : 'text-primary-9!';
  const mutedColor = isCurrentTier ? 'text-primary-4' : 'text-primary-6!';
  const dividerColor = isCurrentTier ? 'bg-white/60' : 'bg-primary-9!';

  return (
    <div className="relative mt-10">
      <div className="flex flex-col gap-2">
        {plan.general_features.map((feature) => (
          <div
            key={feature.label}
            className="font-title flex flex-row items-center justify-between"
          >
            <div className={cn('text-base font-normal', textColor)}>{feature.label}</div>
            <FeatureIcon value={feature.value} />
          </div>
        ))}
        {plan.ai_assistant_features.length > 0 && (
          <>
            <div className={cn('my-3 h-px w-full ', dividerColor)} />
            <div className="flex w-full flex-col">
              <div className={cn('mb-1 text-lg font-semibold tracking-wide uppercase', mutedColor)}>
                AI Assistant
              </div>
              <div className="flex flex-col gap-2">
                {plan.ai_assistant_features.map((feature) => (
                  <CostFeatureRow
                    key={feature._key}
                    feature={feature}
                    textColor={textColor}
                    mutedColor={mutedColor}
                    nameWidth="w-1/3"
                    costWidth="w-2/3"
                  />
                ))}
              </div>
            </div>
          </>
        )}
        {plan.build_features.length > 0 && (
          <>
            <div className={cn('my-3 h-px w-full', dividerColor)} />
            <div className="flex w-full flex-col">
              <div className={cn('mb-1 text-lg font-semibold tracking-wide uppercase', mutedColor)}>
                Build
              </div>
              <div className="flex flex-col gap-2">
                {plan.build_features.map((feature) => (
                  <CostFeatureRow
                    key={feature._key}
                    feature={feature}
                    textColor={textColor}
                    mutedColor={mutedColor}
                    nameWidth="w-1/2"
                    costWidth="w-1/2"
                  />
                ))}
              </div>
            </div>
          </>
        )}
        {plan.simulate_features.length > 0 && (
          <>
            <div className={cn('my-3 h-px w-full', dividerColor)} />
            <div className="flex w-full flex-col">
              <div className={cn('mb-1 text-lg font-semibold tracking-wide uppercase', mutedColor)}>
                Simulate
              </div>
              <div className="flex flex-col gap-2">
                {plan.simulate_features.map((feature) => (
                  <CostFeatureRow
                    key={feature._key}
                    feature={feature}
                    textColor={textColor}
                    mutedColor={mutedColor}
                    nameWidth="w-2/5"
                    costWidth="w-3/5"
                  />
                ))}
              </div>
            </div>
          </>
        )}
        {plan.notebooks_features.length > 0 && (
          <>
            <div className={cn('my-3 h-px w-full', dividerColor)} />
            <div className="flex w-full flex-col">
              <div className={cn('mb-1 text-lg font-semibold tracking-wide uppercase', mutedColor)}>
                Notebooks
              </div>
              <div className="flex flex-col gap-2">
                {plan.notebooks_features.map((feature) => (
                  <CostFeatureRow
                    key={feature._key}
                    feature={feature}
                    textColor={textColor}
                    mutedColor={mutedColor}
                    nameWidth="w-2/5"
                    costWidth="w-3/5"
                  />
                ))}
              </div>
            </div>
          </>
        )}
        {plan.support.length > 0 && (
          <>
            <div className={cn('my-3 h-px w-full', dividerColor)} />
            <div className="flex w-full flex-col">
              <div className={cn('mb-1 text-lg font-semibold tracking-wide uppercase', mutedColor)}>
                Support
              </div>
              <div className="flex flex-col gap-2">
                {plan.support.map((feature) => (
                  <div
                    key={feature.label}
                    className="flex w-full flex-row items-baseline justify-between text-base leading-tight"
                  >
                    <div className={cn('text-base font-normal', textColor)}>{feature.label}</div>
                    <FeatureIcon value={feature.value} />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
