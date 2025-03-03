
'use client';

import { Form } from 'antd';
import { useSetAtom } from 'jotai';
import { Dispatch, SetStateAction, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

import Overview from '@/components/VirtualLab/create-entity-flows/virtual-lab/overview';
import useNotification from '@/hooks/notifications';
import { vlabFlowState } from '@/components/VirtualLab/create-entity-flows/virtual-lab/flow-state';
import { CreateVirtualLabFooter } from '@/components/VirtualLab/create-entity-flows/virtual-lab/footer';

import { createVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { VirtualLabPayload } from '@/api/virtual-lab-svc/types';
import { tryCatch } from '@/api/utils';
import { type VirtualLabFlowSteps, } from '@/components/VirtualLab/create-entity-flows/common/types';

type Props = {
    step: VirtualLabFlowSteps;
    onCancel: () => void;
    onStepChange: (step: VirtualLabFlowSteps) => void;
    onChangeDirection: Dispatch<SetStateAction<"right" | "left">>
};


export default function CreateVirtualLabForm({ step, onCancel, onStepChange }: Props) {
    const { data } = useSession();
    const notify = useNotification();
    const params = useSearchParams();
    const setFlowState = useSetAtom(vlabFlowState);
    const [form] = Form.useForm<VirtualLabPayload>();
    const [isFormValid, setIsFormValid] = useState(false);
    const [pending, startTransition] = useTransition();
    const fields = Form.useWatch<Omit<VirtualLabPayload, 'include_members'>>([], form);

    const allowAskCode = Boolean(isFormValid && fields.email_status !== 'verified');
    const firstLogin = params.get('t') === 'f'; // check if the first login


    const resetForm = () => form.resetFields();


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
            const { data: result, error } = await tryCatch(createVirtualLab(values));
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
                onStepChange("plans");
                setFlowState(prev => ({
                    ...prev,
                    information: result.data?.virtual_lab,
                }))
                // const labUrl = generateLabUrl(result.data.virtual_lab.id);
                // navigate(`${labUrl}/overview`);
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
