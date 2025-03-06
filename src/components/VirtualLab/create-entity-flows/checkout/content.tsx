"use client";

import { useState } from 'react';
import { useAtom } from 'jotai';
import { AnimatePresence, motion } from 'framer-motion';

import PricingTable from '@/components/VirtualLab/create-entity-flows/checkout/price-table';
import PaymentForm from '@/components/VirtualLab/create-entity-flows/checkout/payment-form';
import { FormattedPlan, flowAtom } from '@/components/VirtualLab/create-entity-flows/checkout/shared';
import { useRouter } from 'next/navigation';


export default function Content() {
    const { push: navigate } = useRouter();
    const [slideDirection, onSlideDirectionChange] = useState<'right' | 'left'>('right');
    const [flow, updateFlow] = useAtom(flowAtom);
    const nextDisabled = !flow.selectedPlan?.id;
    const onNextStep = () => {
        onSlideDirectionChange('left');
        updateFlow(prev => ({ ...prev, step: "pay" }));
    };

    const onPreviousStep = () => {
        onSlideDirectionChange('right');
        updateFlow(prev => ({ ...prev, step: "select" }));
    };
    const onSelectPlan = (id: FormattedPlan) => {
        updateFlow(prev => ({
            ...prev,
            selectedPlan: id,
        }))
    }
    const onCancel = () => navigate("/app/virtual-lab/account/subscription");
    return (
        <AnimatePresence initial={false} custom={slideDirection} mode="wait">
            <motion.div
                key={flow.step}
                custom={slideDirection}
                variants={{
                    initial: { opacity: 0 },
                    animate: { opacity: 1 },
                    exit: { opacity: 0 },
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                    duration: 0.3,
                    type: 'tween',
                    ease: 'easeInOut',
                }}
                className="relative flex h-full flex-grow flex-col"
            >
                <div className={flow.step !== 'select' ? 'hidden' : 'h-full'}>
                    <PricingTable
                        disableNext={nextDisabled}
                        onNextStep={onNextStep}
                        selectedPlan={flow.selectedPlan}
                        onSelectPlan={onSelectPlan}
                    />
                </div>
                <div className={flow.step !== 'pay' ? 'hidden' : 'h-full'}>
                    <PaymentForm
                        onCancel={onCancel}
                        onPrevious={onPreviousStep}
                    />
                </div>
            </motion.div>
        </AnimatePresence>
    );
}