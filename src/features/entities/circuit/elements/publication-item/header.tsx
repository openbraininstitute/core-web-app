interface PaperHeaderProps {
  title: string;
  className?: string;
}

export function Header({ title, className }: PaperHeaderProps) {
  return (
    <h2
      className={`text-primary-8 flex-1 cursor-pointer text-xl leading-tight font-bold transition-colors ${className || ''}`}
    >
      {title}
    </h2>
  );
}
