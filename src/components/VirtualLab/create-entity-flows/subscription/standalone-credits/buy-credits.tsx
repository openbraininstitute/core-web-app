'use client';

import { useState } from 'react';
import { Button } from 'antd';

import PaymentForm from '@/components/VirtualLab/create-entity-flows/subscription/standalone-credits/payment-form';
import { classNames } from '@/util/utils';

export default function StandalonePayment() {
  const [isOpen, setOpen] = useState(false);
  const onOpen = () => {
    setOpen(true);
  };
  const onClose = () => setOpen(false);

  return (
    <>
      <Button
        key="buy-credits-btn"
        data-testid="by-credits-btn"
        className={classNames(
          'h-14 rounded-none border border-white bg-primary-9 px-14 text-white',
          'hover:border! hover:border-primary-8! hover:bg-primary-8 hover:font-bold hover:text-white! hover:shadow-xs',
          'disabled:border-gray-400 disabled:bg-white! disabled:text-gray-700! disabled:hover:text-gray-700!',
          'disabled:hover:border-gray-400! disabled:hover:bg-white! disabled:hover:text-gray-700!'
        )}
        type="default"
        size="large"
        htmlType="button"
        onClick={onOpen}
      >
        Buy Credits
      </Button>
      <PaymentForm isOpen={isOpen} onClose={onClose} />
    </>
  );
}
