'use client';

import React from 'react';

import { IconMore } from '../../icons/more';
import { IconEdit } from '../../icons/edit';
import { IconDelete } from '../../icons/delete';
import DialogEdit from './dialog-edit';
import DialogDelete from './dialog-delete';

import { classNames } from '@/util/utils';
import { useAiAssistant } from '@/services/ai-agent/assistant';
import { AiAssistantHistory, AiAssistantHistoryItem } from '@/services/ai-agent/assistant/types';

import styles from './history.module.css';

export interface HistoryProps {
  className?: string;
  onBack(): void;
}

export default function History({ className, onBack }: HistoryProps) {
  const assistant = useAiAssistant();
  const [threadId, setThreadId] = assistant.threadId.use();
  const history = assistant.useHistory();
  const sections = useSections(history);
  const [openEdit, setOpenEdit] = React.useState(false);
  const [openDelete, setOpenDelete] = React.useState(false);
  const [currentThreadId, setCurrentThreadId] = React.useState<string | undefined>(undefined);
  const [currentThreadTitle, setCurrentThreadTitle] = React.useState<string | undefined>(undefined);
  const handleRename = (newThreadId: string, newTitle: string) => {
    setOpenEdit(false);
    assistant.renameThread(newThreadId, newTitle);
  };

  return (
    <>
      <div className={classNames(className, styles.history)}>
        <div>
          {history && (
            <div>
              {sections.map(({ title, list }) => (
                <div key={title}>
                  <h1>{title}</h1>
                  {list.map((thread) => (
                    <div
                      className={classNames(
                        styles.card,
                        threadId === thread.id && styles.currentThread
                      )}
                      key={thread.id}
                    >
                      <button
                        key={thread.id}
                        type="button"
                        className={styles.mainButton}
                        onClick={() => {
                          setThreadId(thread.id);
                          onBack();
                        }}
                      >
                        {thread.title}
                      </button>
                      <div className={styles.actions}>
                        <div className={styles.more}>
                          <IconMore />
                        </div>
                        <menu>
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentThreadId(thread.id);
                              setCurrentThreadTitle(thread.title);
                              setOpenEdit(true);
                            }}
                          >
                            <div>Rename</div>
                            <IconEdit />
                          </button>
                          {threadId !== thread.id && (
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentThreadId(thread.id);
                                setCurrentThreadTitle(thread.title);
                                setOpenDelete(true);
                              }}
                            >
                              <div className={styles.red}>Delete</div>
                              <IconDelete className={styles.red} />
                            </button>
                          )}
                        </menu>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <DialogEdit
        open={openEdit}
        threadId={currentThreadId}
        threadTitle={currentThreadTitle ?? 'Chat'}
        onCancel={() => setOpenEdit(false)}
        onValidate={handleRename}
      />
      <DialogDelete
        open={openDelete}
        threadId={currentThreadId}
        threadTitle={currentThreadTitle ?? 'Chat'}
        onClose={() => setOpenDelete(false)}
      />
    </>
  );
}

function useSections(history: AiAssistantHistory) {
  return React.useMemo(() => {
    const cases: Array<[title: string, days: number]> = [
      ['Today', 1],
      ['Yesterday', 2],
      ['Last 7 days', 7],
      ['Last 30 days', 30],
    ];
    const sections: Array<{ title: string; list: AiAssistantHistory }> = [];
    const list = history.slice();
    for (const [title, days] of cases) {
      const section: { title: string; list: AiAssistantHistory } = { title, list: [] };
      while (list.length > 0) {
        const thread = list.shift();
        if (!thread) break;

        if (deltaDays(thread, days)) {
          section.list.push(thread);
        } else {
          break;
        }
      }
      if (section.list.length > 0) sections.push(section);
    }
    if (list.length > 0) {
      sections.push({ title: 'Older conversations', list });
    }
    return sections;
  }, [history]);
}

function deltaDays(thread: AiAssistantHistoryItem, days: number) {
  const now = new Date();
  const delta = Math.floor((now.valueOf() - thread.date.valueOf()) / (24 * 60 * 60 * 1000));
  return delta < days;
}
