'use client';

import { Form } from 'antd';
import Link from 'next/link';
import { useEffect, useId, useState } from 'react';

import subscribeNewsletterHandler from '@/api/mailchimp/subscribe-newsletter';
import { Checkbox } from '@/ui/molecules/checkbox';
import { Input } from '@/ui/molecules/input';
import { isValidEMail } from '@/util/email';
import { classNames } from '@/util/utils';

interface NewsLetterSubscriptionProps {
  className?: string;
}

type FooterNewsletterForm = {
  email: string;
  accept_terms: boolean;
};

const ERROR_DISMISS_MS = 6000;

function getValidationError(formValues: FooterNewsletterForm): string | null {
  if (!formValues.email) {
    return 'Please enter your email';
  }

  if (!isValidEMail(formValues.email)) {
    return 'Please enter a valid email address';
  }

  if (!formValues.accept_terms) {
    return 'Please accept the privacy policy';
  }

  return null;
}

const formClassName = classNames(
  'relative m-0 flex flex-col items-start justify-between border border-neutral-3 !p-5 text-primary-8 mb-10! lg:mb-0!'
);

const titleClassName = classNames(
  'm-0 font-serif text-2xl leading-[1.3] font-normal text-primary-8 text-balance'
);

const emailInputClassName = classNames(
  'h-auto w-[min(90%,400px)] rounded-none border-0 border-b border-primary-8 bg-transparent px-2 py-2 text-primary-8 shadow-none',
  'outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0',
  'focus:border-b-2 focus-visible:border-b-2 active:border-b-2',
  'placeholder:text-label'
);

const checkboxClassName = classNames(
  'rounded-none shadow-none outline-none focus-visible:ring-0',
  'data-[state=checked]:border-primary-8 data-[state=checked]:bg-primary-8 data-[state=checked]:text-light'
);

const submitButtonClassName = classNames(
  'mt-12 inline-block cursor-pointer rounded-full border border-neutral-3 bg-white px-8 py-2 text-base text-primary-8',
  'transition-colors duration-200 ease-out hover:bg-primary-8 hover:text-light',
  'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:grayscale'
);

const errorClassName = classNames(
  'absolute top-full left-0 z-10 mt-1 max-w-[min(100%,400px)] border border-red-200 bg-white px-3 py-2 text-sm leading-[1.3] wrap-break-word text-destructive'
);

export default function NewsLetterSubscription({ className }: NewsLetterSubscriptionProps) {
  const [form] = Form.useForm<FooterNewsletterForm>();
  const [subscribing, setSubscribing] = useState(false);
  const [status, setStatus] = useState<'success' | 'error' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const id = useId();
  const values = Form.useWatch([], form);

  const canSubmit = Boolean(values?.accept_terms && values?.email && isValidEMail(values.email));

  function reportError(message: string) {
    setStatus('error');
    setErrorMessage(message);
  }

  useEffect(() => {
    if (!errorMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setErrorMessage(null);
      setStatus(null);
    }, ERROR_DISMISS_MS);

    return () => window.clearTimeout(timer);
  }, [errorMessage]);

  async function onSubscribe(formValues: FooterNewsletterForm) {
    setErrorMessage(null);
    setStatus(null);

    const validationError = getValidationError(formValues);
    if (validationError) {
      reportError(validationError);
      return;
    }

    setSubscribing(true);

    try {
      await subscribeNewsletterHandler({
        email: formValues.email,
        name: 'Subscriber',
        tags: ['newsletter'],
      });
      setStatus('success');
      form.resetFields();
    } catch (error) {
      reportError(
        error instanceof Error
          ? error.message
          : 'An error occurred. Please check your details and try again.'
      );
    } finally {
      setSubscribing(false);
    }
  }

  if (status === 'success') {
    return (
      <div
        className={classNames(
          className,
          'relative m-0 mb-10! flex max-w-[max(300px,32%)] flex-col items-center justify-center gap-4 border border-neutral-3 !p-5 text-primary-8 lg:mb-0! max-[1000px]:max-w-none'
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="m-0 h-12 w-12 shrink-0"
        >
          <title>check-circle</title>
          <path
            fill="#0a0"
            d="M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z"
          />
        </svg>
        <h2 className={classNames(titleClassName, 'text-center leading-snug')}>
          You’re all set! Some great news will be coming your way soon!
        </h2>
      </div>
    );
  }

  return (
    <Form
      form={form}
      onFinish={onSubscribe}
      requiredMark={false}
      colon={false}
      className={classNames(className, formClassName)}
      initialValues={{ accept_terms: false, email: '' }}
    >
      <div className="relative shrink-0">
        <h2 className={titleClassName}>Subscribe to our newsletter</h2>
        {errorMessage ? (
          <p className={errorClassName} role="alert">
            {errorMessage}
          </p>
        ) : null}
      </div>

      <div className="flex w-full flex-col items-start justify-start gap-4">
        <Form.Item name="email" noStyle>
          <Input
            type="email"
            placeholder="Enter your email here..."
            autoComplete="email"
            className={emailInputClassName}
          />
        </Form.Item>

        <div className="flex flex-row items-center gap-1 text-base text-primary-8">
          <Form.Item
            name="accept_terms"
            valuePropName="checked"
            trigger="onCheckedChange"
            getValueFromEvent={(checked) => checked === true}
            noStyle
          >
            <Checkbox id={id} className={checkboxClassName} />
          </Form.Item>
          <label htmlFor={id} className="cursor-pointer">
            I have read and accept the{' '}
            <Link
              href="/privacy"
              className="text-base! text-primary-8 underline decoration-current/40 decoration-1 underline-offset-[0.15em] hover:decoration-current"
            >
              privacy policy
            </Link>
          </label>
        </div>

        <button
          type="submit"
          disabled={subscribing || !canSubmit}
          className={submitButtonClassName}
        >
          {subscribing ? 'Subscribing…' : 'Subscribe'}
        </button>
      </div>
    </Form>
  );
}
