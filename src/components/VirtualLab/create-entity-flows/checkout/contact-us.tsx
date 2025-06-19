import { Button } from 'antd';

import Modal from '@/components/VirtualLab/create-entity-flows/common/modal';
import { classNames } from '@/util/utils';

export default function ContactUs({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} footer={null} cls={{ content: 'min-h-[4rem]!' }}>
      <div data-testid="contact-us-form" className="flex flex-col gap-2">
        <h1 className="text-primary-8 text-3xl font-bold">
          Upgrade to Premium – Tell Us Your Needs!
        </h1>
        <p className="text-lg font-light">
          Let us know your requirements, and we&apos;ll tailor your premium subscription experience
          to fit your needs.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button
            key="cancel-btn"
            className={classNames(
              'text-primary-8 h-14 rounded-none border-0 px-6',
              'hover:border-primary-8! hover:text-primary-8! hover:border! hover:bg-white!'
            )}
            size="large"
            htmlType="button"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            key="confirm-btn"
            className={classNames(
              'text-primary-8 flex h-14 max-w-max items-center justify-center rounded-none px-6 text-center align-middle',
              'border-primary-8! hover:bg-primary-8! border! hover:font-bold hover:text-white!'
            )}
            size="large"
            href="mailto:subscription@openbraininstitute.org?subject=Premium Subscription Inquiry"
            htmlType="button"
          >
            Contact us
          </Button>
        </div>
        {/* <div className="mt-3">
          <TextArea rows={10} className="border!" />
        </div> */}
      </div>
    </Modal>
  );
}
