import { RiCheckboxCircleFill, RiCloseCircleLine } from '@remixicon/react';

import { cn } from '@/utils/css-class';

import type { PlanV2 } from '@/types/pricing/planv2';

function FeatureIcon({ value }: { value: boolean }) {
  return value ? (
    <RiCheckboxCircleFill className="size-4 shrink-0 text-green-600" />
  ) : (
    <RiCloseCircleLine className="size-4 shrink-0 text-gray-400" />
  );
}

export default function PlanBody({ plan, dark }: { plan: PlanV2; dark?: boolean }) {
  const textColor = dark ? 'text-white' : 'text-primary-9';
  const mutedColor = dark ? 'text-primary-4' : 'text-gray-400';
  const dividerColor = dark ? 'bg-primary-7' : 'bg-neutral-2';

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
            <div className={cn('my-3 h-px w-full', dividerColor)} />
            <div className="flex w-full flex-col">
              <div className={cn('mb-1 text-lg font-semibold tracking-wide uppercase', mutedColor)}>
                AI Assistant
              </div>
              {plan.ai_assistant_features.map((feature) => (
                <div
                  key={feature.name}
                  className="flex w-full flex-row items-baseline justify-between text-base leading-tight"
                >
                  <div className={cn('w-1/3 font-semibold', textColor)}>{feature.name}</div>
                  <div className={cn('w-2/3 text-right font-normal', mutedColor)}>
                    {feature.cost}
                  </div>
                </div>
              ))}
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
                  <div
                    key={feature.name}
                    className="flex w-full flex-row items-baseline justify-between text-base leading-tight"
                  >
                    <div className={cn('w-1/2 font-semibold', textColor)}>{feature.name}</div>
                    <div className={cn('w-1/2 text-right font-normal', mutedColor)}>
                      {feature.cost}
                    </div>
                  </div>
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
                  <div
                    key={feature.name}
                    className="flex w-full flex-row items-baseline justify-between text-base leading-tight"
                  >
                    <div className={cn('w-2/5 font-semibold', textColor)}>{feature.name}</div>
                    <div className={cn('w-3/5 text-right font-normal', mutedColor)}>
                      {feature.cost}
                    </div>
                  </div>
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
                  <div
                    key={feature.name}
                    className="flex w-full flex-row items-baseline justify-between text-base leading-tight"
                  >
                    <div className={cn('w-2/5 font-semibold', textColor)}>{feature.name}</div>
                    <div className={cn('w-3/5 text-right font-normal', mutedColor)}>
                      {feature.cost}
                    </div>
                  </div>
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
