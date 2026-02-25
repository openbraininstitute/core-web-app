import { RiCheckboxCircleFill, RiCloseCircleLine } from '@remixicon/react';

import type { PlanV2 } from '@/types/pricing/planv2';

function FeatureIcon({ value }: { value: boolean }) {
  return value ? (
    <RiCheckboxCircleFill className="size-4 text-green-600" />
  ) : (
    <RiCloseCircleLine className="size-4 text-gray-400" />
  );
}

export default function PlanBody({ plan }: { plan: PlanV2 }) {
  return (
    <div className="relative mt-10">
      <div className="flex flex-col gap-2">
        {plan.general_features.map((feature) => (
          <div
            key={feature.label}
            className="font-title flex flex-row items-center justify-between"
          >
            <div className="text-primary-9 text-base font-normal">{feature.label}</div>
            <FeatureIcon value={feature.value} />
          </div>
        ))}
        {plan.ai_assistant_features.length > 0 && (
          <>
            <div className="bg-neutral-2 my-3 h-px w-full" />
            <div className="flex w-full flex-col">
              <div className="mb-1 text-lg font-semibold tracking-wide text-gray-400 uppercase">
                AI Assistant
              </div>
              {plan.ai_assistant_features.map((feature) => (
                <div
                  key={feature.name}
                  className="flex w-full flex-row items-baseline justify-between text-base leading-tight"
                >
                  <div className="text-primary-9 w-1/3 font-semibold">{feature.name}</div>
                  <div className="w-2/3 text-right font-normal text-gray-400">{feature.cost}</div>
                </div>
              ))}
            </div>
          </>
        )}
        {plan.build_features.length > 0 && (
          <>
            <div className="bg-neutral-2 my-3 h-px w-full" />
            <div className="flex w-full flex-col">
              <div className="mb-1 text-lg font-semibold tracking-wide text-gray-400 uppercase">
                Build
              </div>
              <div className="flex flex-col gap-2">
                {plan.build_features.map((feature) => (
                  <div
                    key={feature.name}
                    className="flex w-full flex-row items-baseline justify-between text-base leading-tight"
                  >
                    <div className="text-primary-9 w-1/2 font-semibold">{feature.name}</div>
                    <div className="w-1/2 text-right font-normal text-gray-400">{feature.cost}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        {plan.simulate_features.length > 0 && (
          <>
            <div className="bg-neutral-2 my-3 h-px w-full" />
            <div className="flex w-full flex-col">
              <div className="mb-1 text-lg font-semibold tracking-wide text-gray-400 uppercase">
                Simulate
              </div>
              <div className="flex flex-col gap-2">
                {plan.simulate_features.map((feature) => (
                  <div
                    key={feature.name}
                    className="flex w-full flex-row items-baseline justify-between text-base leading-tight"
                  >
                    <div className="text-primary-9 w-2/5 font-semibold">{feature.name}</div>
                    <div className="w-3/5 text-right font-normal text-gray-400">{feature.cost}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        {plan.notebooks_features.length > 0 && (
          <>
            <div className="bg-neutral-2 my-3 h-px w-full" />
            <div className="flex w-full flex-col">
              <div className="mb-1 text-lg font-semibold tracking-wide text-gray-400 uppercase">
                Notebooks
              </div>
              <div className="flex flex-col gap-2">
                {plan.notebooks_features.map((feature) => (
                  <div
                    key={feature.name}
                    className="flex w-full flex-row items-baseline justify-between text-base leading-tight"
                  >
                    <div className="text-primary-9 w-2/5 font-semibold">{feature.name}</div>
                    <div className="w-3/5 text-right font-normal text-gray-400">{feature.cost}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        {plan.support.length > 0 && (
          <>
            <div className="bg-neutral-2 my-3 h-px w-full" />
            <div className="flex w-full flex-col">
              <div className="mb-1 text-lg font-semibold tracking-wide text-gray-400 uppercase">
                Support
              </div>
              <div className="flex flex-col gap-2">
                {plan.support.map((feature) => (
                  <div
                    key={feature.label}
                    className="flex w-full flex-row items-baseline justify-between text-base leading-tight"
                  >
                    <div className="text-primary-9 text-base font-normal">{feature.label}</div>
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
