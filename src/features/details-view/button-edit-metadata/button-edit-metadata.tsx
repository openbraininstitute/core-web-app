import React from 'react';
import { Button } from 'antd';
import { EditOutlined, EyeOutlined } from '@ant-design/icons';

import { classNames } from '@/util/utils';

import styles from './button-edit-metadata.module.css';

interface ButtonEditMetadataProps {
  className?: string;
  label?: string;
  tooltip?: string;
  isEditing: boolean;
  onClick: () => void;
}

export function ButtonEditMetadata({
  className,
  label = 'Edit Metadata',
  isEditing,
  onClick,
}: ButtonEditMetadataProps) {
  return (
    <div className={classNames(styles.buttonEditMetadata, 'text-primary-7')}>
      <Button
        type="text"
        className={classNames(
          className,
          styles.actualButton,
          'text-primary-7 flex items-center gap-2 hover:bg-transparent!'
        )}
        onClick={onClick}
      >
        {label}
        {isEditing ? (
          <EyeOutlined className="border-neutral-2 border px-4 py-3" />
        ) : (
          <EditOutlined className="border-neutral-2 border px-4 py-3" />
        )}
      </Button>
    </div>
  );
}
