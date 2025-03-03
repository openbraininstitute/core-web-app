import { useTransition } from 'react';
import { useAtomValue } from 'jotai';
import { Button, Form } from 'antd';
import { useRouter } from 'next/navigation';

import { vlabFlowState } from '@/components/VirtualLab/create-entity-flows/virtual-lab/flow-state';
import { TextArea } from '@/components/VirtualLab/create-entity-flows/common/inputs';
import { generateLabUrl } from '@/util/virtual-lab/urls';
import { classNames } from '@/util/utils';
import { VirtualLabFlowSteps } from '../common/types';
import { ContactUsFooter } from './footer';


type Props = {
    step: VirtualLabFlowSteps;
    onCancel: () => void;
    onStepChange: (step: VirtualLabFlowSteps) => void;
};

export default function ContactUs({ step, onCancel, onStepChange }: Props) {
    const { push: navigate } = useRouter();
    const [form] = Form.useForm();
    const flowState = useAtomValue(vlabFlowState);
    const [pending, startTransition] = useTransition();

    const onPrevious = () => onStepChange("plans");

    const onFormSubmit = () => {
        // TODO: submit the form
        const labUrl = generateLabUrl(flowState?.information?.id!);
        navigate(`${labUrl}/overview`);
    }

    return (
        <Form
            name="contact-us-flow-step"
            form={form}
            layout="vertical"
            onFinish={onFormSubmit}
            className="relative flex h-full flex-grow flex-col px-4 py-2"
            requiredMark={false}
            validateTrigger={['onChange']}
            initialValues={{
                message: ""
            }}
            disabled={pending}
        >
            <div className="mx-auto h-full w-full max-w-5xl flex-grow bg-white p-12">
                <Form.Item
                    label={<span className="font-semibold text-primary-8">Message</span>}
                    name="message"
                >
                    <TextArea
                        rows={10}
                        placeholder='please provide us with your requirements and specifications'
                        className='!border'
                    />
                </Form.Item>

            </div>
            <ContactUsFooter
                loading={pending}
                onCancel={onCancel}
                onPreviousStep={onPrevious}
            />
        </Form>
    )
}
