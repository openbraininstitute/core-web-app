import Chat from './chat';
import History from './history';
import TabTransitionLoader from './tab-transition-loader/tab-transition-loader';

interface PanelContentProps {
  className?: string;
  threadId: string | undefined;
  tab: 'chat' | 'history';
  onTabChange(tab: 'chat' | 'history'): void;
}

export default function PanelContent({ className, threadId, onTabChange, tab }: PanelContentProps) {
  // if (!threadId) {
  //   return <TabTransitionLoader message="Initializing assistant..." />;
  // }

  return (
    <>
      {tab === 'chat' && <Chat className={className} threadId={threadId} />}
      {tab === 'history' && <History className={className} onBack={() => onTabChange('chat')} />}
    </>
  );
}
