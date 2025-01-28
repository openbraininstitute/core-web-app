export default function IconTwitter({
  iconColor,
  className,
}: {
  iconColor: string;
  className?: string;
}) {
  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 0C5.37257 0 0 5.37257 0 12V60C0 66.6274 5.37257 72 12 72H60C66.6274 72 72 66.6274 72 60V12C72 5.37257 66.6274 0 60 0H12ZM15.5759 15.4286H29.183L38.846 29.1596L50.5714 15.4286H54.8571L40.7813 31.9085L58.1384 56.5714H44.5346L33.3214 40.6406L19.7143 56.5714H15.4286L31.3862 37.8917L15.5759 15.4286ZM22.1384 18.8571L46.3225 53.1429H51.5759L27.3917 18.8571H22.1384Z"
        fill={iconColor}
      />
    </svg>
  );
}
