/* eslint-disable react/jsx-props-no-spreading */

'use client';

import { Alert, Button, Checkbox, ConfigProvider, Form, Result } from 'antd';
import delay from 'es-toolkit/compat/delay';
import Link from 'next/link';
import { type HTMLProps, useState } from 'react';
import { z } from 'zod';

import subscribeNewsletterHandler from '@/api/mailchimp/subscribe-newsletter';
import { Input } from '@/components/inputs/input-outline';
import { classNames } from '@/util/utils';

type TNewsletterForm = {
  email: string;
  name: string;
  accept_terms: boolean;
};

type Props = {
  cls?: {
    container?: HTMLProps<HTMLElement>['className'];
    formItem?: {
      label?: HTMLProps<HTMLElement>['className'];
      input?: HTMLProps<HTMLElement>['className'];
    };
    btn?: HTMLProps<HTMLElement>['className'];
    successMessage?: HTMLProps<HTMLElement>['className'];
  };
  position?: 'page' | 'footer';
};

const newsletterFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  name: z.string({ message: 'Please enter a name.' }).min(2, { message: 'Please a correct name' }),
  accept_terms: z.boolean(),
});

export default function NewsletterForm({ cls, position = 'page' }: Props) {
  const [form] = Form.useForm<TNewsletterForm>();
  const [subscribing, setSubscribing] = useState(false);
  const [status, setStatus] = useState<'success' | 'error' | null>(null);
  const values = Form.useWatch([], form);

  const disableForm =
    (newsletterFormSchema.safeParse(values).error?.issues.length || 0) > 0 || !values.accept_terms;

  const onSubscribe = async (formValues: TNewsletterForm) => {
    try {
      if (values.accept_terms) {
        setSubscribing(true);
        await subscribeNewsletterHandler({
          name: formValues.name,
          email: formValues.email,
          tags: [],
        });
        setStatus('success');
      }
    } catch (_error) {
      setStatus('error');
      delay(() => setStatus(null), 6000);
    } finally {
      setSubscribing(false);
      form.resetFields();
    }
  };

  return (
    <div
      className={classNames(
        'animate-fade-in flex w-full max-w-3xl flex-col bg-white p-8',
        cls?.container
      )}
    >
      <ConfigProvider theme={{ hashed: false }}>
        {status === 'error' && (
          <Alert
            onClose={() => setStatus(null)}
            type="error"
            message="An error occurred. Please check your details and try again"
            className="mb-4 rounded-none font-semibold"
          />
        )}
        {status !== 'success' ? (
          <Form
            form={form}
            onFinish={onSubscribe}
            requiredMark={false}
            layout="vertical"
            validateTrigger={['onChange']}
            className="flex flex-col"
          >
            <Form.Item
              name="name"
              className="mb-7 h-[64.5px] w-full"
              label={
                <span
                  className={classNames('text-primary-8 text-lg font-bold', cls?.formItem?.label)}
                >
                  Name
                </span>
              }
              rules={[{ required: true, message: 'Please enter your name' }]}
            >
              <Input
                placeholder="Enter your first name..."
                className={classNames('h-10', cls?.formItem?.input)}
              />
            </Form.Item>
            <Form.Item
              name="email"
              className="mb-7 h-[64.5px] w-full"
              label={
                <span
                  className={classNames('text-primary-8 text-lg font-bold', cls?.formItem?.label)}
                >
                  Email
                </span>
              }
              rules={[{ required: true, message: 'Please enter your email', type: 'email' }]}
            >
              <Input
                placeholder="Enter your email address"
                className={classNames('h-10', cls?.formItem?.input)}
              />
            </Form.Item>
            <Form.Item
              name="accept_terms"
              valuePropName="checked"
              rules={[{ required: true, message: 'Please accept the privacy policy' }]}
            >
              <Checkbox
                className={classNames(
                  'mr-3 [&_.ant-checkbox-inner]:rounded-none',
                  '[&_.ant-checkbox-checked_.ant-checkbox-inner]:border-primary-8 [&_.ant-checkbox-checked_.ant-checkbox-inner]:bg-primary-8'
                )}
              >
                <span className="text-primary-8 text-lg font-semibold">
                  I have read and accept
                  <Link key="/privacy-policy" href="/privacy-policy" className="ml-1 underline">
                    the privacy policy
                  </Link>
                </span>
              </Checkbox>
            </Form.Item>
            <Form.Item className="mt-auto mb-0">
              <Button
                loading={subscribing}
                htmlType="submit"
                className={classNames(
                  'text-primary-8 w-full rounded-full bg-white px-8 py-3 text-lg font-semibold md:w-auto',
                  'hover:bg-primary-8 mx-auto flex h-auto items-center justify-center transition-colors duration-200 hover:text-white!',
                  'disabled:text-primary-8 disabled:hover:text-primary-4! disabled:hover:bg-gray-100',
                  cls?.btn
                )}
                disabled={disableForm}
              >
                Subscribe to newsletter
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <Result
            status="success"
            title="You’re all set! Some great news will be coming your way soon!"
            className={classNames(
              '[&_.ant-result-title]:text-primary-8 font-serif [&_.ant-result-title]:font-bold',
              position === 'page' && '[&_.ant-result-title]:text-4xl',
              position === 'footer' && '[&_.ant-result-title]:text-2xl'
            )}
          />
        )}
      </ConfigProvider>
    </div>
  );
}
