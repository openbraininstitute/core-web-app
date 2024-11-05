export default function MenuMobileIcon({
  iconColor,
  className,
}: {
  iconColor: string;
  className?: string;
}) {
  return (
    <svg
      width="52"
      height="52"
      viewBox="0 0 52 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M20 10C20 15.5228 15.5228 20 10 20C4.47715 20 0 15.5228 0 10C0 4.47715 4.47715 0 10 0C15.5228 0 20 4.47715 20 10Z"
        fill={iconColor}
      />
      <path
        d="M52 10C52 15.5228 47.5228 20 42 20C36.4772 20 32 15.5228 32 10C32 4.47715 36.4772 0 42 0C47.5228 0 52 4.47715 52 10Z"
        fill={iconColor}
      />
      <path
        d="M20 42C20 47.5228 15.5228 52 10 52C4.47715 52 0 47.5228 0 42C0 36.4772 4.47715 32 10 32C15.5228 32 20 36.4772 20 42Z"
        fill={iconColor}
      />
      <path
        d="M52 42C52 47.5228 47.5228 52 42 52C36.4772 52 32 47.5228 32 42C32 36.4772 36.4772 32 42 32C47.5228 32 52 36.4772 52 42Z"
        fill={iconColor}
      />
    </svg>
  );
}
