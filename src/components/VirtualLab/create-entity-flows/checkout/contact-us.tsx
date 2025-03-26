import { Button } from 'antd';
import Modal from '@/components/VirtualLab/create-entity-flows/common/modal';
import { classNames } from '@/util/utils';

export default function ContactUs({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} footer={null} cls={{ content: '!min-h-[4rem]' }}>
      <div data-testid="contact-us-form" className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-primary-8">
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
              'h-14 rounded-none border-0 px-6 text-primary-8',
              'hover:!border hover:!border-primary-8 hover:!bg-white hover:!text-primary-8'
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
              'flex h-14 max-w-max items-center justify-center rounded-none px-6 text-center align-middle text-primary-8',
              '!border !border-primary-8 hover:!bg-primary-8 hover:font-bold hover:!text-white'
            )}
            size="large"
            href="mailto:support@openbraininstitute.org?subject=Premium Subscription Inquiry"
            htmlType="button"
          >
            Contact us
          </Button>
        </div>
        {/* <div className="mt-3">
          <TextArea rows={10} className="!border" />
        </div> */}
      </div>
    </Modal>
  );
}
