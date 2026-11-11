interface PaperHeaderProps {
  title: string;
  className?: string;
}

export function Header({ title, className }: PaperHeaderProps) {
  return (
    <h2
      className={`text-white flex-1 text-xl leading-tight font-bold transition-colors ${className || ''}`}
    >
      {title}
    </h2>
  );
}
