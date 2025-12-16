import { Spinner } from '../spinner';
import Chat from './chat';
import History from './history';

interface PanelContentProps {
  className?: string;
  threadId: string | undefined;
  onClearChat(): void;
  tab: 'chat' | 'history';
  onTabChange(tab: 'chat' | 'history'): void;
}

export default function PanelContent({
  className,
  threadId,
  onClearChat,
  onTabChange,
  tab,
}: PanelContentProps) {
  return (
    <>
      {threadId ? (
        <>
          {tab === 'chat' && (
            <Chat
              key={threadId}
              className={className}
              threadId={threadId}
              onClearChat={onClearChat}
            />
          )}
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
