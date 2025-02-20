/* eslint-disable react/jsx-props-no-spreading */

'use client';

import { HTMLProps, useState } from 'react';
import Link from 'next/link';
import { Form, Button, ConfigProvider, Checkbox, Result, Alert } from 'antd';
import { z } from 'zod';
import delay from 'lodash/delay';

import { classNames } from '@/util/utils';
import { Input } from '@/components/inputs/input-outline';
import subscribeNewsletterHandler from '@/api/mailchimp/subscribe-newsletter';
import { useMediaQuery } from '@/hooks/use-media-query';

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
};

const newsletterFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  name: z
    .string({ message: 'Please enter a name.' })
    .min(2, { message: 'Please a correct name' })
    .optional(),
  accept_terms: z.boolean(),
});

export default function NewsletterForm({ cls }: Props) {
  const isWide = useMediaQuery('(min-width: 768px)');
  const [form] = Form.useForm<TNewsletterForm>();
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeResult, setSubscribeResult] = useState<{
    status: 'success' | 'error' | null;
    msg?: string;
  } | null>(null);
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
          tags: ['comingsoon'],
        });
        setSubscribeResult({ status: 'success' });
      }
    } catch (error: any) {
      setSubscribeResult({
        status: 'error',
        msg: 'message' in (error as { message: string }) ? error.message : null,
      });
      delay(() => setSubscribeResult(null), 6000);
    } finally {
      setSubscribing(false);
      form.resetFields();
    }
  };

  return (
    <div
      className={classNames(
        'flex w-full max-w-full  flex-col bg-white',
        'p-4 sm:max-w-3xl md:p-8',
        cls?.container
      )}
    >
      <ConfigProvider theme={{ hashed: false }}>
        {subscribeResult?.status === 'error' && (
          <Alert
            onClose={() => setSubscribeResult(null)}
            type="error"
            message={
              subscribeResult.msg ?? 'An error occurred. Please check your details and try again'
            }
            className="mb-4 rounded-none font-semibold"
          />
        )}
        {subscribeResult?.status !== 'success' ? (
          <Form
            form={form}
            onFinish={onSubscribe}
            requiredMark={false}
            layout="vertical"
            validateTrigger={['onChange']}
            className="flex w-full flex-col"
          >
            <Form.Item
              name="name"
              className="mb-7 h-[64.5px] w-full min-w-full"
              label={
                <span
                  className={classNames(
                    'text-base font-bold text-primary-8 md:text-lg',
                    cls?.formItem?.label
                  )}
                >
                  Name
                </span>
              }
            >
              <Input
                placeholder="Enter your name"
                className={classNames('h-10 w-full min-w-0', cls?.formItem?.input)}
                size={isWide ? 'large' : 'small'}
              />
            </Form.Item>
            <Form.Item
              name="email"
              className="mb-7 h-[64.5px] w-full  min-w-full"
              label={
                <span
                  className={classNames(
                    'text-base font-bold text-primary-8 md:text-lg',
                    cls?.formItem?.label
                  )}
                >
                  Email
                  <span className="ml-1 font-bold text-red-600">*</span>
                </span>
              }
              rules={[{ required: true, message: 'Please enter your email', type: 'email' }]}
            >
              <Input
                placeholder="Enter your email"
                className={classNames('h-10 w-full  min-w-0', cls?.formItem?.input)}
                size={isWide ? 'large' : 'small'}
              />
            </Form.Item>
            <Form.Item
              name="accept_terms"
              valuePropName="checked"
              rules={[{ required: true, message: 'Please accept the privacy policy' }]}
              className="mb-4 md:mb-7"
            >
              <Checkbox
                className={classNames(
                  'mr-3 [&_.ant-checkbox-inner]:rounded-none ',
                  '[&_.ant-checkbox-checked_.ant-checkbox-inner]:border-primary-8 [&_.ant-checkbox-checked_.ant-checkbox-inner]:bg-primary-8'
                )}
              >
                <span className="text-base font-semibold text-primary-8 md:text-lg">
                  I have read and accept
                  <Link
                    target="_blank"
                    href="/privacy"
                    rel="noopener noreferrer"
                    className="ml-1 underline"
                  >
                    the privacy policy
                  </Link>
                </span>
              </Checkbox>
            </Form.Item>
            <Form.Item className="mb-0 mt-auto">
              <Button
                loading={subscribing}
                htmlType="submit"
                className={classNames(
                  'w-auto rounded-full bg-white px-8 py-3 text-lg font-semibold text-primary-8',
                  'mx-auto flex h-auto items-center justify-center transition-colors duration-200 hover:bg-primary-8 hover:!text-white',
                  'disabled:text-primary-8 disabled:hover:bg-gray-100 disabled:hover:!text-primary-4',
                  cls?.btn
                )}
                disabled={disableForm}
              >
                Submit
              </Button>
            </Form.Item>
          </Form>
        ) : (
          <Result
            status="success"
            title="You’re all set! Some great news will be coming your way soon!"
            className={classNames(
              'font-serif  [&_.ant-result-title]:font-bold [&_.ant-result-title]:text-primary-8',
              'mx-auto max-w-full sm:max-w-[80%] lg:max-w-[60%]',
              '[&_.ant-result-title]:text-2xl sm:[&_.ant-result-title]:text-4xl'
            )}
          />
        )}
      </ConfigProvider>
    </div>
  );
}
