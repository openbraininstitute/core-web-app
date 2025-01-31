export default function IconLinkedin({
  iconColor = 'currentColor',
  className,
}: {
  iconColor?: string;
  className?: string;
}) {
  return (
    <svg
      width="1.5em"
      height="1.5em"
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fillRule="evenodd"
        clip-rule="evenodd"
        d="M64 72H8C3.58154 72 0 68.4182 0 64V8C0 3.58179 3.58154 0 8 0H64C68.4185 0 72 3.58179 72 8V64C72 68.4182 68.4185 72 64 72ZM51.3154 62H62V40.0513C62 30.7644 56.7358 26.2742 49.3823 26.2742C42.0259 26.2742 38.9302 32.0029 38.9302 32.0029V27.3333H28.6333V62H38.9302V43.802C38.9302 38.926 41.1748 36.0244 45.4707 36.0244C49.4199 36.0244 51.3154 38.8127 51.3154 43.802V62ZM10 16.397C10 19.9297 12.8423 22.7939 16.3491 22.7939C19.8564 22.7939 22.6968 19.9297 22.6968 16.397C22.6968 12.8643 19.8564 10 16.3491 10C12.8423 10 10 12.8643 10 16.397ZM21.7695 62H11.0327V27.3333H21.7695V62Z"
        fill={iconColor}
      />
    </svg>
  );
}
