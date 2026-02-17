import { CheckCircleOutlined, CopyOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import React from 'react';

import { ToolbarButton } from '@/components/buttons/toolbar';
import { CustomPopover } from '@/features/entities/neuron-simulation/experiment/elements/popover';
import { useCopyToClipboard } from '@/hooks/useCopyClipboard';
import { classNames } from '@/util/utils';

import styles from '@/ui/molecules/button-copy-id/button-copy-id.module.css';

interface ButtonCopyIdProps {
  className?: string;
  label?: string;
  tooltip?: string;
  value: string;
}

export function ButtonCopyId({
  className,
  value,
  tooltip = 'Database ID',
  label = 'Copy ID',
}: ButtonCopyIdProps) {
  const [copied, setCopied] = React.useState(false);
  const handleClick = () => {
    setCopied(true);
    navigator.clipboard.writeText(value);
    window.setTimeout(() => setCopied(false), 5000);
  };

  return (
    <div className={classNames(styles.buttonCopyId, 'text-primary-7', copied && styles.copied)}>
      <Button
        type="text"
        className={classNames(
          className,
          styles.actualButton,
          'text-primary-7 flex items-center gap-2 hover:bg-transparent!'
        )}
        onClick={handleClick}
      >
        {label}
        <CopyOutlined className="border-neutral-2 border px-4 py-3" />
      </Button>
      <div className={styles.tooltip}>{tooltip}</div>
      <HasBeenCopied />
    </div>
  );
}

function HasBeenCopied() {
  return (
    <div className={styles.copiedLabel}>
      <div>Copied</div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em">
        <title>check</title>
        <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" fill="#3e0" />
      </svg>
    </div>
  );
}

export function DetailViewCopyButton({ id }: { id: string }) {
  const [, copyId, , copying] = useCopyToClipboard();
  return (
    <CustomPopover
      message="Database ID"
      when="hover"
      key={`copy-id-${id}`}
      cls={{ contentContainer: 'p-3!' }}
      placement="bottom"
    >
      <button type="button" onClick={() => copyId(id)}>
        <ToolbarButton
          stateIcon={
            copying ? <CheckCircleOutlined className="text-accent-dark! text-[21px]" /> : undefined
          }
          icon={<CopyOutlined className="text-[21px]" />}
        >
          Copy ID
        </ToolbarButton>
      </button>
    </CustomPopover>
  );
}
