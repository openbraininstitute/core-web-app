import { cn } from '@/utils/css-class';

export interface LabelProps {
  className?: string;
  text: string;
  required?: boolean;
}

export function Label({ className, text, required = false }: LabelProps) {
  return (
    <span className={cn(className, 'text-neutral-4/80 text-sm leading-5 font-light uppercase')}>
      {text} {required && <sup className="text-lg text-red-400">*</sup>}
    </span>
  );
}
