import { Spinner } from '../spinner';
import Chat from './chat';
import History from './history';

interface PanelContentProps {
  className?: string;
  threadId: string | undefined;
  tab: 'chat' | 'history';
  onTabChange(tab: 'chat' | 'history'): void;
}

export default function PanelContent({ className, threadId, onTabChange, tab }: PanelContentProps) {
  return (
    <>
      {threadId ? (
        <>
          {tab === 'chat' && <Chat className={className} threadId={threadId} />}
          {tab === 'history' && (
            <History className={className} onBack={() => onTabChange('chat')} />
          )}
        </>
      ) : (
        <Spinner />
      )}
    </>
  );
}
