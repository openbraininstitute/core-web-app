
'use client';

import { Form } from 'antd';
import { Dispatch, SetStateAction, useState, useTransition } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

import Overview from '@/components/VirtualLab/create-entity-flows/virtual-lab/overview';
import useNotification from '@/hooks/notifications';
import { CreateVirtualLabFooter } from '@/components/VirtualLab/create-entity-flows/virtual-lab/footer';

import { createVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { VirtualLabPayload } from '@/api/virtual-lab-svc/types';
import { generateLabUrl } from '@/util/virtual-lab/urls';
import {
    virtualLabFlowSteps,
    type VirtualLabFlowSteps,
} from '@/components/VirtualLab/create-entity-flows/common/types';
import { tryCatch } from '@/api/utils';

type Props = {
    step: VirtualLabFlowSteps;
    onCancel: () => void;
    onStepChange: (step: VirtualLabFlowSteps) => void;
    onChangeDirection: Dispatch<SetStateAction<"right" | "left">>
};


export default function CreateVirtualLabForm({ step, onCancel, onStepChange, onChangeDirection }: Props) {
    const notify = useNotification();
    const { push: navigate } = useRouter();
    const { data } = useSession();
    const params = useSearchParams();

    const [form] = Form.useForm<VirtualLabPayload>();
    const [isFormValid, setIsFormValid] = useState(false);
    const [pending, startTransition] = useTransition();
    const fields = Form.useWatch<Omit<VirtualLabPayload, 'include_members'>>([], form);

    const allowAskCode = Boolean(isFormValid && fields.email_status !== 'verified');
    const firstLogin = params.get('t') === 'f'; // check if the first login

    const onNextStep = () => {
        onChangeDirection('left');
        const currentIndex = virtualLabFlowSteps.findIndex((s) => s.id === step);
        if (currentIndex < virtualLabFlowSteps.length - 1) {
            onStepChange(virtualLabFlowSteps[currentIndex + 1].id);
        }
    };

    const onPreviousStep = () => {
        onChangeDirection('right');
        const currentIndex = virtualLabFlowSteps.findIndex((s) => s.id === step);
        if (currentIndex > 0) {
            onStepChange(virtualLabFlowSteps[currentIndex - 1].id);
        }
    };

    const resetForm = () => form.resetFields();

    const onSelectPlan = (id: string) => {
        form.setFieldValue('plan_id', id);
        if (typeof window !== 'undefined')
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    };

    const onValuesChange = (changedValues: VirtualLabPayload, values: VirtualLabPayload) => {
        if ('reference_email' in changedValues && values?.email_status !== 'none') {
            form.setFieldValue('email_status', 'none');
        }
        form
            .validateFields({ validateOnly: true })
            .then(() => {
                setIsFormValid(true);
            })
            .catch((error) => {
                setIsFormValid(!(error.errorFields.length > 0));
            });
    };

    const onFormSubmit = async (values: VirtualLabPayload) => {
        startTransition(async () => {
            const formValues = {
                ...values,
                include_members:
                    values.include_members?.map((o) => ({ email: o.email, role: o.role })) ?? null,
            };
            const { data: result, error } = await tryCatch(createVirtualLab(formValues));
            if (error || !result || !result.data) {
                notify.error(
                    'Virtual Lab creation failed. Please check your details and try again.',
                    undefined,
                    'topRight',
                    undefined
                );
            }
            if (result && result.data) {
                notify.success(
                    'Your Virtual Lab has been created successfully and is now ready to use.',
                    undefined,
                    'topRight',
                    undefined
                );
                resetForm();
                const labUrl = generateLabUrl(result.data.virtual_lab.id);
                navigate(`${labUrl}/overview`);
            }
        });
    };

    return (
        <Form
            name="virtual-lab-creation-flow-step"
            form={form}
            layout="vertical"
            onFinish={onFormSubmit}
            className="relative flex h-full flex-grow flex-col px-4 py-2"
            requiredMark={false}
            validateTrigger={['onChange']}
            initialValues={{
                name: firstLogin ? `${data?.user.name}'s virtual lab` : undefined,
                description: '',
                entity: null,
                include_members: [],
            }}
            onValuesChange={onValuesChange}
            disabled={pending}
        >
            <div className={step !== 'information' ? 'hidden' : 'h-full'}>
                <Overview allowAskCode={allowAskCode} />
            </div>
            <CreateVirtualLabFooter
                {...{
                    onCancel,
                    loading: pending,
                    disabled: !isFormValid || pending,
                }}
            />
        </Form>
    )
}
