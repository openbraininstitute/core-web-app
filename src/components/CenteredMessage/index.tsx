import type { ReactElement } from 'react';

type CenteredMessageProps = {
  message: string;
  icon?: ReactElement<any>;
};

export function CenteredMessage({ message, icon }: CenteredMessageProps) {
  return (
    <div className="flex h-40 items-center justify-center">
      <div className="text-center">
        {icon && icon}
        <div className="mt-4">{message}</div>
      </div>
    </div>
  );
}

export default CenteredMessage;
