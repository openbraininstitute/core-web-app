export function CopyIcon({ iconColor, className }: { iconColor: string; className?: string }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1.16091 3.39519H5.4539C6.09227 3.39519 6.6148 3.91777 6.6148 4.5561V8.84909C6.6148 9.48747 6.09223 10.01 5.4539 10.01H1.16091C0.522532 10.01 0 9.48742 0 8.84909V4.5561C0 3.91773 0.522576 3.39519 1.16091 3.39519ZM3.93205 0.000108605H8.22504C8.86342 0.000108605 9.38595 0.522684 9.38595 1.16101V5.45401C9.38595 6.09238 8.86337 6.61491 8.22504 6.61491H7.10269V4.55599C7.10269 3.64954 6.36082 2.90764 5.45433 2.90764H2.77147V1.16091C2.77147 0.522532 3.29405 0 3.93238 0L3.93205 0.000108605Z"
        fill={iconColor}
      />
    </svg>
  );
}
