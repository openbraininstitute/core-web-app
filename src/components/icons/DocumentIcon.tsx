export default function DocumentIcon({
  iconColor,
  className,
}: {
  iconColor: string;
  className?: string;
}) {
  return (
    <svg
      width="11"
      height="12"
      viewBox="0 0 11 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.23769 3.42863V0.268443C6.34966 0.328443 6.44661 0.388443 6.52591 0.454875L9.80925 3.18758C9.88853 3.25401 9.96139 3.3349 10.0342 3.42919L6.23769 3.42863ZM5.20751 3.64238C5.20751 3.99702 5.55412 4.28523 5.98001 4.28523H10.3568V11.3571C10.3568 11.7118 10.0102 12 9.58429 12H0.772498C0.346601 12 0 11.7118 0 11.3571V0.642857C0 0.288219 0.346601 0 0.772498 0H5.20751V3.64238Z"
        fill={iconColor}
      />
    </svg>
  );
}
