import { Button } from 'antd';
import { classNames } from '@/util/utils';

type Props = {
  loading: boolean;
  disabled: boolean;
  onCancel: () => void;
};

export function CreateVirtualLabFooter({ loading, disabled, onCancel }: Props) {
  return (
    <div className="mx-auto mt-auto w-full max-w-5xl lg:max-w-full">
      <div className="px-4 py-4">
        <div className="mt-auto w-full">
          <div className="flex items-end justify-end gap-3">
            <Button
              key="cancel-btn"
              className={classNames(
                'h-14 rounded-none bg-white px-6 text-primary-8',
                'hover:border! hover:border-primary-8 hover:bg-white! hover:font-bold hover:text-primary-8!'
              )}
              type="text"
              size="large"
              htmlType="button"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              key="create-vlab-btn"
              className={classNames(
                'h-14 rounded-none border border-white bg-primary-9 px-14 text-white',
                'hover:border! hover:border-primary-8! hover:bg-primary-8 hover:font-bold hover:text-white! hover:shadow-xs',
                'disabled:border-gray-400 disabled:bg-white! disabled:text-gray-700! disabled:hover:text-gray-700!',
                'disabled:hover:border-gray-400! disabled:hover:bg-white! disabled:hover:text-gray-700!'
              )}
              type="default"
              size="large"
              htmlType="submit"
              disabled={disabled}
              loading={loading}
            >
              Create virtual lab
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
