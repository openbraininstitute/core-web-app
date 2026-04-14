import { useId } from 'react';

export function TransformedLink({
  url,
  className,
}: {
  url: string;
  className?: React.ComponentProps<'a'>['className'];
}) {
  const id = useId();
  return (
    <a
      onClick={(e) => e.stopPropagation()}
      key={id}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {url}
    </a>
  );
}
