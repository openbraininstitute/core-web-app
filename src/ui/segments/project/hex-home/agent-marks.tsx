import { AGENTS } from '@/ui/segments/project/brains-walkthrough/agent-ready';
import { cn } from '@/utils/css-class';

/**
 * The agents the platform can be driven from, by their marks, as the website's home shows them after "Agent ready"
 * (Claude, OpenAI, Perplexity, Kiro): large, in a row, for the AI card's picture (the user asked).
 */
export function AgentMarks({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn('flex items-center', className)}>
      {AGENTS.map(({ name, path, evenOdd }) => (
        <svg key={name} role="img" aria-label={name} viewBox="0 0 24 24" className={markClassName} fill="currentColor">
          <title>{name}</title>
          <path d={path} fillRule={evenOdd ? 'evenodd' : undefined} />
        </svg>
      ))}
    </span>
  );
}
