import { CSSProperties } from 'react';

type LinkIconProps = {
  className?: string;
  style?: CSSProperties;
};

export default function CancelledIcon({ className, style }: LinkIconProps) {
  return (
    <svg
      className={className}
      style={style}
      width="1em"
      height="1em"
      viewBox="0 0 12 12"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M10.1032 7.90615C11.1507 7.90615 12 7.05525 12 6.01092V5.98908C12 4.94241 11.1522 4.09385 10.1032 4.09385H9.80294C8.75549 4.09385 7.90615 3.24606 7.90615 2.19706V1.89679C7.90615 0.849342 7.05525 0 6.01092 0H5.98908C4.94241 0 4.09385 0.847785 4.09385 1.89679V2.19706C4.09385 3.24451 3.24606 4.09385 2.19706 4.09385H1.89679C0.849342 4.09385 0 4.94475 0 5.98908V6.01092C0 7.05759 0.847785 7.90615 1.89679 7.90615H2.19706C3.24451 7.90615 4.09385 8.75393 4.09385 9.80294V10.1032C4.09385 11.1507 4.94475 12 5.98908 12H6.01092C7.05759 12 7.90615 11.1522 7.90615 10.1032V9.80294C7.90615 8.75549 8.75393 7.90615 9.80294 7.90615H10.1032Z"
        fill="currentColor"
      />
    </svg>
  );
}
