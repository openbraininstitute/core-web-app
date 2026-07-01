import { isToolUIPart } from 'ai';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import React from 'react';

import { useAccessToken } from '@/hooks/useAccessToken';
import {
  useAiAgentRateLimit,
  useServiceAiAgentChat,
  useServiceAiAgentSuggestionFromUserJourney,
} from '@/services/ai-agent';
import { useAiAssistant } from '@/services/ai-agent/assistant';
import {
  activeDiffMessageIdAtom,
  clearDiffStateAtom,
  messageSubmittedCounterAtom,
} from '@/state/config-highlights';
import { pendingAssistantQuestionAtom } from '@/ui/segments/project/get-started/sections/use-assistant-question';
import { classNames } from '@/util/utils';

import ErrorPanel from '../error';
import FreeCreditsNotification from '../free-credits-notification';
import { MessageItem } from '../message-item';
import { PendingUserMessage } from '../message-item/pending-user-message';
import { ThinkingIndicator } from '../message-item/thinking-indicator';
import { atomRateLimit } from '../state';
import DiffBar from './diff-bar';
import Footer from './footer';
import { OverlayScrollbar } from './overlay-scrollbar';
import SuggestedQuestions from './suggested-questions';
import TabTransitionLoader from './tab-transition-loader/tab-transition-loader';
import { useAutoScroll } from './use-auto-scroll';
import { useLastMessageDiffBar } from './use-last-message-diff-bar';
import Welcome from './welcome';

import styles from './chat.module.css';

export interface ChatProps {
  className?: string;
  threadId: string | undefined;
  onRefetchSuggestions?: (fn: () => void) => void;
  onClearSuggestions?: (fn: () => void) => void;
}

export default function Chat({
  className,
  threadId,
  onRefetchSuggestions,
  onClearSuggestions,
}: ChatProps) {
  const assistant = useAiAssistant();
  const isEmptyThread = assistant.isEmptyThread.useValue();
  const healthError = assistant.healthError.useValue();

  const {
    messages,
    status,
    sendMessage,
    error,
    stop,
    isLoadingMessages,
    pendingUserMessage,
    addToolApprovalResponse,
  } = useServiceAiAgentChat(threadId ?? '');
  const [suggestions, clearSuggestions, isLoadingSuggestions, refetchSuggestions] =
    useServiceAiAgentSuggestionFromUserJourney(threadId ?? '', status);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally only re-run when refetchSuggestions identity changes to register the latest callback references
  React.useEffect(() => {
    onRefetchSuggestions?.(refetchSuggestions);
    onClearSuggestions?.(clearSuggestions);
  }, [refetchSuggestions]);

  const accessToken = useAccessToken();
  const rateLimit = useAtomValue(atomRateLimit);
  const setRateLimit = useSetAtom(atomRateLimit);
  const [activeDiffMessageId, setActiveDiffMessageId] = useAtom(activeDiffMessageIdAtom);
  const clearDiffState = useSetAtom(clearDiffStateAtom);
  const setMessageSubmittedCounter = useSetAtom(messageSubmittedCounterAtom);
  const [showExhaustedNotification, setShowExhaustedNotification] = React.useState(false);

  // Panel-level diff bar & highlight management for the last message
  const { diffBarData, clearDiffBarData } = useLastMessageDiffBar(messages, status);
  const prevRemainingRef = React.useRef<number | null>(null);
  const hasInitializedRef = React.useRef(false);

  const refContainer = React.useRef<HTMLDivElement | null>(null);

  const { data: fetchedRateLimit } = useAiAgentRateLimit(accessToken ?? null);

  React.useEffect(() => {
    if (fetchedRateLimit && !hasInitializedRef.current) {
      setRateLimit(fetchedRateLimit.chat_streamed);
      prevRemainingRef.current = fetchedRateLimit.chat_streamed.remaining;
      hasInitializedRef.current = true;
    }
  }, [fetchedRateLimit, setRateLimit]);

  React.useEffect(() => {
    if (rateLimit && hasInitializedRef.current) {
      const prev = prevRemainingRef.current;
      const current = rateLimit.remaining;

      if (prev !== null && prev > 0 && current === 0) {
        setShowExhaustedNotification(true);
      }

      prevRemainingRef.current = current;
    }
  }, [rateLimit]);

  const { setAutoScroll, scrollToBottom, handleWheel } = useAutoScroll({
    messages,
    status,
    isLoadingMessages,
    threadId,
    containerRef: refContainer,
  });

  const hasUnresolvedApprovals = React.useMemo(
    () =>
      messages.some((msg) =>
        msg.parts.some((p) => isToolUIPart(p) && p.state === 'approval-requested')
      ),
    [messages]
  );

  // Clear active diff view when a new message is submitted
  React.useEffect(() => {
    if (status === 'submitted') {
      setActiveDiffMessageId(null);
      clearDiffBarData();
      clearDiffState();
      setMessageSubmittedCounter((c) => c + 1);
    }
  }, [
    status,
    setActiveDiffMessageId,
    clearDiffBarData,
    clearDiffState,
    setMessageSubmittedCounter,
  ]);

  // Clear active diff view when switching conversations
  // biome-ignore lint/correctness/useExhaustiveDependencies: threadId is a reactive trigger only; not used inside the effect body
  React.useEffect(() => {
    setActiveDiffMessageId(null);
    clearDiffBarData();
    clearDiffState();
  }, [threadId, setActiveDiffMessageId, clearDiffBarData, clearDiffState]);

  // Toggle diff view on/off from the diff bar
  const handleToggleDiffs = React.useCallback(() => {
    if (!diffBarData) return;

    if (activeDiffMessageId === diffBarData.messageId) {
      // Currently viewing diffs — turn off
      setActiveDiffMessageId(null);
    } else {
      // Turn on diffs for this message
      setActiveDiffMessageId(diffBarData.messageId);
    }
  }, [diffBarData, activeDiffMessageId, setActiveDiffMessageId]);

  // Dismiss the diff bar entirely (also clears any active diff view)
  const handleCloseDiffBar = React.useCallback(() => {
    clearDiffBarData();
    setActiveDiffMessageId(null);
    clearDiffState();
  }, [clearDiffBarData, setActiveDiffMessageId, clearDiffState]);

  // Scrolling + autoscroll control when new message.
  const handlePrompt = (content: string, files?: File[]) => {
    setAutoScroll(true);
    sendMessage(content, files);
    scrollToBottom();
    requestAnimationFrame(scrollToBottom);
  };

  const [pendingQuestion, setPendingQuestion] = useAtom(pendingAssistantQuestionAtom);
  const pendingConsumedRef = React.useRef(false);

  React.useEffect(() => {
    if (pendingQuestion && threadId && status === 'ready' && !pendingConsumedRef.current) {
      pendingConsumedRef.current = true;
      const question = pendingQuestion;
      setPendingQuestion(null);
      setAutoScroll(true);
      sendMessage(question);
      scrollToBottom();
      requestAnimationFrame(scrollToBottom);
    }
    if (!pendingQuestion) {
      pendingConsumedRef.current = false;
    }
  }, [
    pendingQuestion,
    threadId,
    status,
    setPendingQuestion,
    sendMessage,
    setAutoScroll,
    scrollToBottom,
  ]);

  const lastMessage = messages[messages.length - 1];
  const hasVisibleContent = lastMessage?.parts.some(
    (p) => (p.type === 'text' && 'text' in p && p.text !== '') || isToolUIPart(p)
  );
  const hasApprovalResponded = lastMessage?.parts.some(
    (p) => isToolUIPart(p) && p.state === 'approval-responded'
  );
  // Don't show "Thinking" when the SDK auto-sends after tool approval
  const showThinking =
    (status === 'submitted' || (status === 'streaming' && !hasVisibleContent)) &&
    !hasApprovalResponded;

  return (
    <div className={classNames(styles.chatContainer, className)}>
      <div className={styles.articlesWrapper}>
        <div className={styles.articles} ref={refContainer} onWheel={handleWheel}>
          {threadId && isLoadingMessages && !isEmptyThread ? (
            <TabTransitionLoader message="Loading conversation..." />
          ) : (
            <>
              {(!threadId || isEmptyThread) && <Welcome />}
              {messages.map((item, index) => (
                <MessageItem
                  key={item.id}
                  value={item}
                  status={status}
                  isLastMessage={index === messages.length - 1}
                  addToolApprovalResponse={addToolApprovalResponse}
                />
              ))}

              {pendingUserMessage && (
                <PendingUserMessage
                  text={pendingUserMessage.text}
                  files={pendingUserMessage.files}
                />
              )}

              {showThinking && !pendingUserMessage && <ThinkingIndicator />}
              {status === 'ready' && messages.length > 0 && (
                <div className={styles.footerButtons}></div>
              )}
              {(!threadId || isEmptyThread) && (
                <div className={styles.suggestedQuestionsContainer}>
                  <SuggestedQuestions
                    onClick={handlePrompt}
                    suggestions={suggestions}
                    clearSuggestions={clearSuggestions}
                    isLoading={isLoadingSuggestions || status !== 'ready' || !!pendingUserMessage}
                  />
                </div>
              )}
              {threadId && !isEmptyThread && status === 'ready' && !pendingUserMessage && (
                <div className={styles.suggestedQuestionsContainerInChat}>
                  <SuggestedQuestions
                    onClick={handlePrompt}
                    suggestions={suggestions}
                    clearSuggestions={clearSuggestions}
                    isLoading={isLoadingSuggestions || status !== 'ready'}
                  />
                </div>
              )}
              {error && <ErrorPanel value={error} />}
              {healthError && <ErrorPanel value={healthError} />}
            </>
          )}
          <div className={styles.bottom} />
        </div>
        <OverlayScrollbar containerRef={refContainer} />
      </div>
      {showExhaustedNotification && status === 'ready' && (
        <div className={styles.notificationOverlay}>
          <FreeCreditsNotification
            onDismiss={() => setShowExhaustedNotification(false)}
            resetIn={rateLimit?.reset_in ?? null}
          />
        </div>
      )}
      {rateLimit && rateLimit.remaining === 0 && status === 'ready' && (
        <div
          className={styles.creditBalanceIndicator}
          style={{ marginTop: messages.length === 0 ? '-1.2em' : '0em' }}
        >
          Using Credit Balance
        </div>
      )}
      <div className={styles.bottomBar}>
        <div
          className={classNames(
            styles.diffBarSlider,
            diffBarData ? styles.diffBarSliderVisible : undefined
          )}
          aria-hidden={!diffBarData}
        >
          <div className={styles.diffBarInner}>
            {diffBarData && (
              <DiffBar
                isViewingDiffs={activeDiffMessageId === diffBarData.messageId}
                onToggleDiffs={handleToggleDiffs}
                onClose={handleCloseDiffBar}
              />
            )}
          </div>
        </div>
        <Footer
          className={styles.footer}
          status={status}
          threadId={threadId}
          onPrompt={handlePrompt}
          messagesCount={messages.length}
          stop={stop}
          isUploading={!!pendingUserMessage}
          hasUnresolvedApprovals={hasUnresolvedApprovals}
        />
      </div>
    </div>
  );
}

function PendingUserMessage({
  text,
  files,
}: {
  text: string;
  files: { name: string; type: string; previewUrl: string; uploaded: boolean }[];
}) {
  return (
    <div className={messageStyles.user}>
      <div className={messageStyles.userContent}>
        {text && <div>{text}</div>}
        {files.map((file) => {
          if (file.type.startsWith('image/') && file.previewUrl) {
            // When uploaded, render the image exactly like MessageItem does
            // (no wrapper div) to avoid layout shift on transition.
            if (file.uploaded) {
              return (
                // biome-ignore lint/performance/noImgElement: blob: URL preview — Next/Image does not support blob: protocol
                <img
                  key={file.name}
                  src={file.previewUrl}
                  alt={file.name}
                  className={messageStyles.userImage}
                />
              );
            }
            return (
              <div key={file.name} className={styles.pendingFile}>
                {/* biome-ignore lint/performance/noImgElement: blob: URL preview — Next/Image does not support blob: protocol */}
                <img
                  src={file.previewUrl}
                  alt={file.name}
                  className={messageStyles.userImage}
                  style={{ opacity: 0.6 }}
                />
                <div className={styles.pendingFileOverlay}>
                  <span className={styles.pendingFileSpinner} />
                </div>
              </div>
            );
          }
          return (
            <div key={file.name} className={styles.pendingFilePill}>
              {!file.uploaded && <span className={styles.pendingFileSpinner} />}
              <span>{file.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
