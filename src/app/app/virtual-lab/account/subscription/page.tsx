import { Button } from 'antd';
import Link from 'next/link';
import Modal from "@/components/VirtualLab/create-entity-flows/common/modal";
import SubscriptionStatus from '@/components/VirtualLab/subscription-billing/subscription-status';
import { classNames } from '@/util/utils';

function Upgrade() {
  return (
    <Link
      href="/app/virtual-lab/account/subscription/checkout"
      key="upgrade-link"
      className={classNames(
        'h-14 rounded-none border border-white bg-primary-9 px-14 text-white text-lg flex items-center justify-center',
        'hover:!border hover:!border-primary-8 hover:bg-primary-8 hover:font-bold hover:!text-white hover:shadow-sm',
        'disabled:border-gray-400 disabled:!bg-white disabled:!text-gray-700 disabled:hover:!text-gray-700',
        'disabled:hover:!border-gray-400 disabled:hover:!bg-white disabled:hover:!text-gray-700'
      )}
    >
      Upgrade
    </Link>
  )
}

function Downgrade() {
  return (
    <Button
      key="downgrade-link"
      className={classNames(
        'h-14 rounded-none border border-white bg-primary-9 px-14 text-white text-lg',
        'hover:!border hover:!border-primary-8 hover:bg-primary-8 hover:font-bold hover:!text-white hover:shadow-sm',
        'disabled:border-gray-400 disabled:!bg-white disabled:!text-gray-700 disabled:hover:!text-gray-700',
        'disabled:hover:!border-gray-400 disabled:hover:!bg-white disabled:hover:!text-gray-700'
      )}
      type="default"
      size="large"
    >
      Downgrade
    </Button>
  )
}

export default function Page() {
  return (
    <div className="h-full w-full">
      <SubscriptionStatus />
      <div className='flex items-center justify-end gap-3 w-full'>
        <Downgrade />
        <Upgrade />
      </div>
      <Modal>

      </Modal>
    </div>
  );
}