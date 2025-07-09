import React from 'react';

import { IconMore } from '../../icons/more';
import { IconEdit } from '../../icons/edit';
import { IconDelete } from '../../icons/delete';
import DialogEdit from './dialog-edit';

import { classNames } from '@/util/utils';
import { useServiceAiAgentThreadList } from '@/services/ai-agent';
import { useAiAssistant } from '@/services/ai-agent/assistant';

import styles from './history.module.css';

export interface HistoryProps {
  className?: string;
}

export default function History({ className }: HistoryProps) {
  const assistant = useAiAssistant();
  const [threadId, setThreadId] = assistant.threadId.use();
  const [openEdit, setOpenEdit] = React.useState(false);
  const [currentThreadId, setCurrentThreadId] = React.useState<string | undefined>(undefined);
  const [currentThreadTitle, setCurrentThreadTitle] = React.useState<string | undefined>(undefined);
  const history = useServiceAiAgentThreadList();
  const handleRename = (newTitle: string) => {
    if (history) {
      const index = history.findIndex((item) => item.id === currentThreadId);
      if (index !== -1) history[index].title = newTitle;
    }
    setOpenEdit(false);
  };

  return (
    <>
      <div className={classNames(className, styles.history)}>
        <h1>History</h1>
        {history && (
          <div>
            {history.map((thread) => (
              <div className={styles.card} key={thread.id}>
                <button
                  key={thread.id}
                  type="button"
                  className={styles.mainButton}
                  onClick={() => setThreadId(thread.id)}
                >
                  <pre>{JSON.stringify(thread, null, 2)}</pre>
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
                        onClick={() =>
                          console.log({
                            threadId,
                            thread,
                          })
                        }
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
        )}
      </div>
      <DialogEdit
        open={openEdit}
        threadId={currentThreadId}
        threadTitle={currentThreadTitle ?? 'Chat'}
        onCancel={() => setOpenEdit(false)}
        onValidate={handleRename}
      />
    </>
  );
}
