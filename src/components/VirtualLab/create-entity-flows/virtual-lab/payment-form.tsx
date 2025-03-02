import { PaymentElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import {
    FormEvent,
    useState,
    useEffect,
    useRef,
    ChangeEvent,
    Dispatch,
    SetStateAction,
} from 'react';
import { Button, Spin } from 'antd';
import { Stripe, StripeElementsOptions } from '@stripe/stripe-js';

import { useAtomValue, useSetAtom } from 'jotai';
import { CloseOutlined, LoadingOutlined } from '@ant-design/icons';
import z from 'zod';

import useNotification from '@/hooks/notifications';
import { getZodErrorPath, isStringEmpty } from '@/util/utils';
import {
    SetupIntentResponse,
    addNewPaymentMethodToVirtualLab,
    generateSetupIntent,
} from '@/services/virtual-lab/billing';
import sessionAtom from '@/state/session';
import {
    transactionFormStateAtom,
    virtualLabPaymentMethodsAtomFamily,
} from '@/state/virtual-lab/lab';
import { useAccessToken } from '@/hooks/useAccessToken';
import { ADDING_NEW_PAYMENT_METHOD_FAILED, ADDING_NEW_PAYMENT_METHOD_SUCCEEDED, PREPARING_STRIPE_FORM } from '../../Billing/messages';
import getStripe from '../../Billing/utils';
import StripeInput from '../../Billing/StripeInput';
import { PaymentFooter } from './footer';
import PricingToggleCards from '@/components/VirtualLab/create-entity-flows/virtual-lab/subscription-plans/price-card';



type StripeFormProps = {
    virtualLabId: string;
    onCancel: () => void;
    onPrevious: () => void;
};

type PaymentFormProps = {
    onCancel: () => void;
    onPrevious: () => void;
    virtualLabId: string;
};

const cardholderName = z.object({
    name: z.string({ message: "Cardholder name is required" }).min(2, { message: "Cardholder name must be at least 2 characters long" })
});

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


export function Form({ virtualLabId, onCancel, onPrevious }: StripeFormProps) {
    const elements = useElements();
    const stripe = useStripe();
    const { error: errorNotify, success: successNotify } = useNotification();
    const [stripeElementsReady, setElementsReady] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    const [name, setName] = useState<string>("");
    const [nameError, setNameError] = useState<string | null>(null);

    const formLoaded = stripe && elements;
    const disableForm = !formLoaded || formLoading;

    const onNameChange = (e: ChangeEvent<HTMLInputElement>) => setName(e.target.value);
    const onNameBlur = async (e: ChangeEvent<HTMLInputElement>) => {
        const { error } = await cardholderName.safeParseAsync({ name });
        if (error) setNameError(error.flatten().fieldErrors.name?.join("\n") ?? null);
        else setNameError(null);
    }


    const onReady = () => setElementsReady(true);

    const onPaymentMethodSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (!stripe || !elements) {
            return null;
        }

        setFormLoading(true);
        const formData = new FormData(event.currentTarget);

        // Convert FormData to an object
        const data = Object.fromEntries(formData.entries());

        console.log("Form Data:", data);
        setFormLoading(false);

        try {
            const { error, setupIntent } = await stripe.confirmSetup({
                elements,
                redirect: 'if_required',
                confirmParams: {
                    return_url: window.location.href,
                },
            });

            console.log("ᦨ #  payment-form.tsx:127 #  onPaymentMethodSubmit #  setupIntent:", setupIntent);


        } catch (error) {
        } finally {
            elements.getElement('payment')?.clear();
        }
    };

    return (
        <form
            name="stripe-payment-flow-step"
            className="mx-auto w-full h-full flex flex-col flex-grow"
            onSubmit={onPaymentMethodSubmit}
        >
            <div className="mx-auto w-full max-w-2xl h-full flex flex-col flex-grow">
                <PricingToggleCards />
                {stripeElementsReady && (
                    <div className="w-full">
                        <StripeInput
                            id="name"
                            type="text"
                            name="name"
                            title="Cardholder name"
                            value={name}
                            error={nameError}
                            onChange={onNameChange}
                            onBlur={onNameBlur}
                        />
                    </div>
                )}
                <PaymentElement onReady={onReady} />
            </div>
            {stripeElementsReady && (
                <PaymentFooter
                    disabled={disableForm}
                    loading={formLoading}
                    onPreviousStep={onPrevious}
                    onCancel={onCancel}
                />
            )}
        </form>
    );
}


export default function PaymentForm({ virtualLabId, onCancel, onPrevious }: PaymentFormProps) {
    const stripeRef = useRef(false);
    const session = useAtomValue(sessionAtom);
    const { error: errorNotify } = useNotification();
    const [stripePromise, setStripePromise] = useState<Stripe | null>(null);
    const [loadingStripe, setLoadingStripe] = useState(false);

    const [{ client_secret: clientSecret, customer_id: customerId }, setStripeSetupObject] = useState<
        SetupIntentResponse['data']
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
                        generateSetupIntent(virtualLabId, session.accessToken),
                        getStripe(),
                    ]);
                    setStripePromise(stripeObject);
                    setStripeSetupObject(stripeSetup.data);
                    setLoadingStripe(false);
                }
            } catch (error) {
                errorNotify(PREPARING_STRIPE_FORM, undefined, 'topRight', true, virtualLabId);
                setLoadingStripe(false);
            }
        }

        if (virtualLabId && !stripeRef.current) {
            initializeStripe();
            stripeRef.current = true;
        }
    }, [errorNotify, session, virtualLabId]);

    if (loadingStripe)
        return (
            <div className="flex items-center justify-center py-7 h-full flex-grow">
                <Spin size="large" indicator={<LoadingOutlined />} />
            </div>
        );

    return (
        <div className="flex h-full flex-grow flex-col">
            <Elements stripe={stripePromise} options={buildStripeFormOptions(clientSecret)}>
                <Form
                    {...{
                        customerId,
                        virtualLabId,
                        onCancel,
                        onPrevious
                    }}
                />
            </Elements>

        </div>
    );
}
