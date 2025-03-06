import { PaymentElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { FormEvent, useState, useEffect, useRef, ChangeEvent } from 'react';
import { Stripe, StripeElementsOptions } from '@stripe/stripe-js';
import { LoadingOutlined } from '@ant-design/icons';
import { useAtomValue } from 'jotai';
import { Button, Spin } from 'antd';

import getStripe from '@/components/VirtualLab/Billing/utils';
import useNotification from '@/hooks/notifications';
import sessionAtom from '@/state/session';

import PricingToggleCards from '@/components/VirtualLab/create-entity-flows/checkout/price-card';
import { getSetupIntent } from '@/api/virtual-lab-svc/queries/payment';
import { SetupIntentResponse } from '@/services/virtual-lab/billing';
import { classNames } from '@/util/utils';

type Props = {
    onCancel: () => void;
    onPrevious: () => void;
};


const buildStripeFormOptions = (clientSecret: string): StripeElementsOptions => ({
    clientSecret,
    fonts: [
        {
            family: 'Titillium Web',
            cssSrc:
                'https://fonts.googleapis.com/css2?family=Titillium+Web:ital,wght@0,200;0,300;0,400;0,600;0,700;0,900;1,200;1,300;1,400;1,600;1,700&display=swap',
        },
    ],
    appearance: {
        variables: {
            fontFamily: 'Titillium Web',
            fontSizeSm: '1rem',
        },
        rules: {
            '.Input:focus': {
                boxShadow:
                    '0px 1px 1px rgba(0, 0, 0, 0.03), 0px 3px 6px rgba(18, 42, 66, 0.02), 0 0 0 2px #0050B3',
                borderColor: 'none',
            },
        },
    },
});


export function Form({ onCancel, onPrevious }: Props) {
    const elements = useElements();
    const stripe = useStripe();
    const [stripeElementsReady, setElementsReady] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const formLoaded = stripe && elements;
    const disableForm = !formLoaded || formLoading;


    const onReady = () => setElementsReady(true);

    const onPaymentMethodSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (!stripe || !elements) {
            return null;
        }

        try {
            setFormLoading(true);
            // const formData = new FormData(event.currentTarget);
            // const data = Object.fromEntries(formData.entries());
            await stripe.confirmSetup({
                elements,
                redirect: 'if_required',
                confirmParams: {
                    return_url: window.location.href,
                },
            });
            const subscription = undefined;
        } catch (error) {
            // TODO: handle error properly
            throw new Error('error paying');
        } finally {
            elements.getElement('payment')?.clear();
            setFormLoading(false);
        }
    };

    return (
        <form
            name="stripe-payment-flow-step"
            className="mx-auto flex h-full w-full flex-grow flex-col items-center justify-center"
            onSubmit={onPaymentMethodSubmit}
            aria-disabled={disableForm}
        >
            <div className="flex h-full flex-grow flex-col items-center justify-center max-w-3xl w-full">
                <PricingToggleCards />
                <div className="flex w-full mx-auto flex-col bg-white py-14 px-5 rounded-lg">
                    <div className='w-full max-w-xl mx-auto'>
                        <PaymentElement
                            id="subscription-form"
                            onReady={onReady}
                        />
                    </div>
                </div>
            </div>

            {stripeElementsReady && (
                <div className="flex items-end justify-end gap-3 mt-auto w-full">
                    <Button
                        key="back-to-btn"
                        className={classNames(
                            'h-14 rounded-none px-6 text-white',
                            'hover:!border hover:!border-white hover:!text-white hover:font-bold'
                        )}
                        type="text"
                        size="large"
                        htmlType="button"
                        onClick={onPrevious}
                    >
                        Back
                    </Button>
                    <Button
                        key="pay-subscription"
                        className={classNames(
                            'h-14 rounded-none border border-white bg-primary-9 px-14 text-white',
                            'hover:!border hover:!border-primary-8 hover:bg-primary-8 hover:font-bold hover:!text-white hover:shadow-sm',
                            'disabled:border-gray-400 disabled:!bg-white disabled:!text-gray-700 disabled:hover:!text-gray-700',
                            'disabled:hover:!border-gray-400 disabled:hover:!bg-white disabled:hover:!text-gray-700'
                        )}
                        type="default"
                        size="large"
                        htmlType="submit"
                        disabled={disableForm}
                        loading={formLoading}
                    >
                        Pay
                    </Button>
                </div>
            )}
        </form>
    );
}

export default function PaymentForm({
    onCancel,
    onPrevious,
}: Props) {
    const stripeRef = useRef(false);
    const session = useAtomValue(sessionAtom);
    const { error: errorNotify } = useNotification();
    const [stripePromise, setStripePromise] = useState<Stripe | null>(null);
    const [loadingStripe, setLoadingStripe] = useState(false);

    const [setupIntent, setStripeSetupObject] = useState<
        SetupIntentResponse['data'] | null
    >({
        id: '',
        client_secret: '',
        customer_id: '',
    });

    useEffect(() => {
        async function initializeStripe() {
            try {
                setLoadingStripe(true);
                if (session) {
                    const [stripeSetup, stripeObject] = await Promise.all([
                        getSetupIntent(),
                        getStripe(),
                    ]);
                    setStripePromise(stripeObject);
                    setStripeSetupObject(stripeSetup.data);
                    setLoadingStripe(false);
                }
            } catch (error) {
                errorNotify(
                    "We're having some trouble setting up your payment options at the moment. Please try again in a little while.",
                    undefined,
                    'topRight',
                    true,
                );
                setLoadingStripe(false);
            }
        }

        if (!stripeRef.current) {
            initializeStripe();
            stripeRef.current = true;
        }
    }, [errorNotify, session]);

    if (loadingStripe || !setupIntent)
        return (
            <div className="flex h-full flex-grow items-center justify-center py-7">
                <Spin size="large" indicator={<LoadingOutlined />} />
            </div>
        );

    return (
        <div className="flex h-full flex-grow flex-col">
            <Elements stripe={stripePromise} options={buildStripeFormOptions(setupIntent?.client_secret)}>
                <Form
                    {...{
                        customerId: setupIntent.customer_id,
                        onCancel,
                        onPrevious,
                    }}
                />
            </Elements>
        </div>
    );
}
