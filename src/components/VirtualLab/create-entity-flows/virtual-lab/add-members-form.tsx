'use client';

import { useState, useTransition } from 'react';
import { useAtomValue } from 'jotai';
import { Form } from 'antd';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';


import MemberList from '@/components/VirtualLab/create-entity-flows/common/member-form';
import useNotification from '@/hooks/notifications';

import { vlabFlowState } from '@/components/VirtualLab/create-entity-flows/virtual-lab/flow-state';
import { AddMembersFooter, } from '@/components/VirtualLab/create-entity-flows/virtual-lab/footer';
import { List } from '@/components/VirtualLab/create-entity-flows/common/member-avatar';
import { createVirtualLab } from '@/api/virtual-lab-svc/queries/virtual-lab';
import { VirtualLabPayload } from '@/api/virtual-lab-svc/types';
import { generateLabUrl } from '@/util/virtual-lab/urls';
import { extractInitials } from '@/util/slugify';
import { tryCatch } from '@/api/utils';

import { type VirtualLabFlowSteps, } from '@/components/VirtualLab/create-entity-flows/common/types';

type Props = {
    step: VirtualLabFlowSteps;
    onCancel: () => void;
    onStepChange: (step: VirtualLabFlowSteps) => void;
};

function Members() {
    const { data } = useSession();
    const id = data?.user.email!;
    const name = data?.user.name!;
    const email = data?.user.email!;
    const initials = extractInitials(name);

    return (
        <List
            members={[
                {
                    id,
                    email,
                    role: 'admin',
                    name,
                    initials,
                },
            ]}
        />
    );
}

export default function AddMembers({ step, onCancel, onStepChange }: Props) {
    const notify = useNotification();
    const { push: navigate } = useRouter();
    const [form] = Form.useForm<VirtualLabPayload>();
    const [isFormValid, setIsFormValid] = useState(false);
    const [pending, startTransition] = useTransition();
    const flowState = useAtomValue(vlabFlowState);


    const resetForm = () => form.resetFields();
    const onPrevious = () => onStepChange("payment");
    const onValuesChange = () => {
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
    if (flowState?.plan?.title === "Free") return (
        <div className="relative flex h-full flex-grow flex-col px-4 py-2">
            <div className='mx-auto flex h-full w-full max-w-5xl flex-grow flex-col bg-white p-12'>
                <Members />
                <div className="my-10 h-px bg-gray-100" />
                <div className='w-full p-6 bg-[#F0F0F0]'>
                    <div className=''>
                        <h1 className='text-xl font-bold'>Do you want to add other members?</h1>
                        <p className='text-lg font-light'>Subscribe to our pro plan in order to invite new members</p>
                    </div>
                </div>
            </div>
            <AddMembersFooter
                {...{
                    showSubmit: false,
                    onCancel,
                    onPrevious: () => onStepChange('plans'),
                    loading: pending,
                    disabled: !isFormValid || pending,
                }}
            />
        </div>
    )
    return (
        <Form
            name="add-members-flow-step"
            form={form}
            layout="vertical"
            onFinish={onFormSubmit}
            className="relative flex h-full flex-grow flex-col px-4 py-2"
            requiredMark={false}
            validateTrigger={['onChange']}
            initialValues={{
                include_members: [],
            }}
            onValuesChange={onValuesChange}
            disabled={pending}
        >
            <MemberList
                ListCompo={Members}
                cls={{ listContainer: 'max-h-[calc(100vh-500px)] mb-5 secondary-scrollbar' }}
            />
            <AddMembersFooter
                {...{
                    onCancel,
                    onPrevious,
                    loading: pending,
                    disabled: !isFormValid || pending,
                }}
            />
        </Form>
    )
}
