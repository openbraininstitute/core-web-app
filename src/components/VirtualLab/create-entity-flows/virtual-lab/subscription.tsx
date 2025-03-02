'use client';

import { useState } from 'react';

import Plans from '@/components/VirtualLab/create-entity-flows/virtual-lab/subscription-plans';
import PaymentForm from '@/components/VirtualLab/create-entity-flows/virtual-lab/payment-form';

import {
    type VirtualLabFlowSteps,
} from '@/components/VirtualLab/create-entity-flows/common/types';



type Props = {
    step: VirtualLabFlowSteps;
    onCancel: () => void;
    onStepChange: (step: VirtualLabFlowSteps) => void;
};

export default function Subscription({ step, onCancel, onStepChange }: Props) {
    const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
    const onSelectPlan = (id: string) => setSelectedPlan(id);
    const onNextPayment = () => onStepChange("payment");
    const onPreviousPlans = () => onStepChange("plans");

    return (
        <div className="h-full flex flex-grow flex-col">
            <div className={step !== 'plans' ? 'hidden' : 'relative flex h-full flex-grow flex-col px-4 py-2'}>
                <Plans
                    selectedPlan={selectedPlan}
                    onSelectPlan={onSelectPlan}
                    onCancel={onCancel}
                    onNextPayment={onNextPayment}
                />
            </div>
            <div className={step !== 'payment' ? 'hidden' : 'relative flex h-full flex-grow flex-col px-4 py-2'}>
                <PaymentForm
                    virtualLabId='081b9eb8-a5e5-44eb-8815-bac492d4ef3c'
                    onCancel={onCancel}
                    onPrevious={onPreviousPlans}
                />
            </div>
        </div>
    )
}
