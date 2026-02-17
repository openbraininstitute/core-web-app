import Link from 'next/link';

import { useAIToolsInvertedSelection } from '@/components/ai-assistant/state';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { classNames } from '@/util/utils';

import { IconChecked } from './icon-checked';
import { IconUnchecked } from './icon-unchecked';

import type { AIAssistantTool } from '@/services/ai-agent/tools/ai-assistant-tool';

import styles from './tool-card.module.css';

interface ToolCardProps {
  className?: string;
  tool: AIAssistantTool;
}

export default function ToolCard({ className, tool }: ToolCardProps) {
  const { virtualLabId, projectId } = useWorkspace();
  const [invertedSelection, setInvertedSelection] = useAIToolsInvertedSelection();
  /**
   * A tool is checked if it's id is not in invertedSelection array.
   */
  const checked = Boolean(invertedSelection && !invertedSelection.includes(tool.id));
  const Icon = tool.icon;
  const handleToggle = () => {
    if (checked) setInvertedSelection([...(invertedSelection ?? []), tool.id]);
    else setInvertedSelection((invertedSelection ?? []).filter((id) => id !== tool.id));
  };

  return (
    <div className={classNames(className, styles.toolCard)}>
      <header aria-checked={checked} onClick={handleToggle} tabIndex="0">
        <Icon />
        <div>{tool.name}</div>
        {checked ? <IconChecked /> : <IconUnchecked />}
      </header>
      <p>{tool.description}</p>
      <Link
        href={tool.docURL(virtualLabId, projectId)}
        target="documentation"
        className={styles.readmore}
      >
        Read more
      </Link>
    </div>
  );
}
