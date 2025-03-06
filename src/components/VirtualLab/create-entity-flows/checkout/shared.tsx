"use client";

import { forwardRef, } from "react";
import { atom } from "jotai";
import * as SwitchPrimitives from "@radix-ui/react-switch"

import { ContentForPricing } from "@/components/LandingPage/content/pricing";
import { classNames } from "@/util/utils";

export const Switch = forwardRef<
    React.ElementRef<typeof SwitchPrimitives.Root>,
    React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & {
        thumbCls: string;
    }
>(({ className, thumbCls, ...props }, ref) => (
    <SwitchPrimitives.Root
        className={classNames(
            "peer inline-flex h-5 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
            className
        )}
        {...props}
        ref={ref}
    >
        <SwitchPrimitives.Thumb
            className={classNames(
                "pointer-events-none block h-3 w-3 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
                thumbCls
            )}
        />
    </SwitchPrimitives.Root>
))


export type FormattedFeature = {
    name: string;
    category?: string;
    free: { value: boolean; label?: string | null; tooltip?: string | null };
    pro: { value: boolean; label?: string | null; tooltip?: string | null };
    premium: { value: boolean; label?: string | null; tooltip?: string | null };
}

export type FormattedPlan = {
    id: string;
    title: string;
    price: {
        month: { value?: number, currency?: string, discount?: number },
        year: { value?: number, currency?: string, discount?: number }
    };
    description: string;
    notes?: string[];
}

export type FormattedPricingData = {
    features: FormattedFeature[];
    planDetails: FormattedPlan[];
    groupedFeatures: Record<string, FormattedFeature[]>
}

export function convertPricingData(data: ContentForPricing): FormattedPricingData {
    const basicPlanId = data.plans.find(plan => plan.title === "Free")?.id || "";
    const proPlanId = data.plans.find(plan => plan.title === "Pro")?.id || "";
    const premiumPlanId = data.plans.find(plan => plan.title === "Premium")?.id || "";

    const planDetails: FormattedPlan[] = data.plans.map(plan => {
        const monthlyPrice = plan.price.month.find(p => p.currency === "CHF");
        const yearlyPrice = plan.price.yearNormal.find(p => p.currency === "CHF");
        const yearlyDiscount = plan.price.yearDiscount.find(p => p.currency === "CHF");
        return {
            id: plan.id,
            title: plan.title,
            price: {
                month: { value: monthlyPrice?.value, currency: monthlyPrice?.currency },
                year: { value: yearlyPrice?.value, currency: yearlyPrice?.currency, discount: yearlyDiscount?.value }
            },
            description: plan.title === "Free" ? "Everything you need to get started" :
                plan.title === "Pro" ? "Perfect for growing teams" :
                    "For large-scale projects",
            notes: plan.notes
        };
    });



    const formattedFeatures: FormattedFeature[] = [];

    data.features.forEach(category => {
        category.features.forEach(feature => {
            const freeFeature = feature.plans.find(plan => plan.id === basicPlanId)!;
            const proFeature = feature.plans.find(plan => plan.id === proPlanId)!;
            const premiumFeature = feature.plans.find(plan => plan.id === premiumPlanId)!;

            formattedFeatures.push({
                name: feature.title,
                category: category.title,
                free: { value: !!freeFeature?.id, label: freeFeature?.label, tooltip: freeFeature?.tooltip },
                pro: { value: !!proFeature?.id, label: proFeature?.label, tooltip: proFeature?.tooltip },
                premium: { value: !!premiumFeature?.id, label: premiumFeature?.label, tooltip: premiumFeature?.tooltip },
            });
        });
    });

    const groupedFeatures = formattedFeatures.reduce((acc, feature) => {
        const category = feature.category || "Uncategorized";
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(feature);
        return acc;
    }, {} as Record<string, FormattedFeature[]>);

    return {
        features: formattedFeatures,
        planDetails,
        groupedFeatures,
    };
}

export const flowAtom = atom<{
    step: "select" | "pay" | null;
    selectedPlan: FormattedPlan | null;
}>({
    step: "select",
    selectedPlan: null,
});

