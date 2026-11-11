import type { JSX, ReactNode } from 'react';

export function ToolbarButton({
  icon,
  children,
  stateIcon,
}: {
  icon: JSX.Element;
  stateIcon?: JSX.Element;
  children: ReactNode;
}) {
  return (
    <div className="group hover:text-primary-6 relative flex cursor-pointer items-center gap-2 pl-3">
      <div className="flex items-center px-2 group-hover:py-2">{children}</div>
      <div className="border-neutral-2 relative flex items-center justify-center border p-2 group-focus-within:border-none group-hover:border-none">
        {stateIcon ?? icon}
      </div>
      <div className="border-neutral-2 absolute inset-0 border opacity-0 transition-opacity duration-100 group-focus-within:opacity-100 group-hover:opacity-100" />
    </div>
  );
}
