import { useState } from 'react';
import { Button } from 'antd';

import PaymentForm from '@/components/VirtualLab/create-entity-flows/subscription/standalone-credits/payment-form';
import { classNames } from '@/util/utils';

export default function StandalonePayment() {
  const [isOpen, setOpen] = useState(false);
  const onOpen = () => setOpen(true);
  const onClose = () => setOpen(false);

  return (
    <>
      <Button
        key="buy-credits-btn"
        className={classNames(
          'h-14 rounded-none px-6 text-white',
          'border border-white hover:!bg-primary-8 hover:font-bold hover:!text-white'
        )}
        type="primary"
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
