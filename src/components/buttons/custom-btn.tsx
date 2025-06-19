import { Button } from 'antd';

import { classNames } from '@/util/utils';

export default function CustomButton({
  loading,
  disable,
  className,
  onClick,
  children,
}: {
  loading?: boolean;
  disable?: boolean;
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Button
      key="create-project-btn"
      className={classNames(
        'bg-primary-9 h-14 rounded-none border border-white px-14 text-white',
        'hover:border-primary-8! hover:bg-primary-8! hover:border! hover:font-bold hover:text-white! hover:shadow-xs',
        'disabled:border-gray-400 disabled:bg-white! disabled:text-gray-700! disabled:hover:text-gray-700!',
        'disabled:hover:border-gray-400! disabled:hover:bg-white! disabled:hover:text-gray-700!'
      )}
      type="default"
      size="large"
      htmlType="button"
      disabled={disable}
      loading={loading}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
