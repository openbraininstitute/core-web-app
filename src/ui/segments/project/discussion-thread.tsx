'use client';

import { RiSendPlaneFill } from '@remixicon/react';
import { Avatar } from 'antd';

import { COLOR_DICTIONARY } from '@/util/color';
import { cn } from '@/utils/css-class';

type DummyMessage = {
  id: string;
  author: string;
  initials: string;
  colorIndex: number;
  timestamp: string;
  text: string;
};

const DUMMY_MESSAGES: Array<DummyMessage> = [
  {
    id: '1',
    author: 'Elena Rossi',
    initials: 'ER',
    colorIndex: 0,
    timestamp: '2d ago',
    text: 'Pushed the latest ion channel build — results look promising. Can someone review the parameter sweep?',
  },
  {
    id: '2',
    author: 'Marcus Chen',
    initials: 'MC',
    colorIndex: 2,
    timestamp: '1d ago',
    text: 'Looks good to me. The conductance values align with the paper. I will kick off a circuit simulation tomorrow.',
  },
  {
    id: '3',
    author: 'Priya Ananth',
    initials: 'PA',
    colorIndex: 4,
    timestamp: '4h ago',
    text: 'Uploaded a new morphology dataset to the project. Let me know if you need the metadata exported.',
  },
];

export function DiscussionThread() {
  return (
    <div className="border-neutral-2 flex min-h-0 flex-1 flex-col gap-3 rounded-xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-primary-9 text-sm font-bold">Discussion</h3>
        <span className="text-neutral-4 text-xs">{DUMMY_MESSAGES.length} messages</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        {DUMMY_MESSAGES.map((message) => {
          const color = COLOR_DICTIONARY[message.colorIndex % COLOR_DICTIONARY.length];
          return (
            <div key={message.id} className="flex items-end gap-2">
              <Avatar
                size={28}
                shape="circle"
                style={{ backgroundColor: color.background, color: color.color }}
                className="shrink-0 text-xs font-bold"
              >
                {message.initials}
              </Avatar>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-baseline gap-2 px-1">
                  <span className="text-primary-9 truncate text-xs font-semibold">
                    {message.author}
                  </span>
                  <span className="text-neutral-4 text-[10px]">{message.timestamp}</span>
                </div>
                <div className="relative max-w-fit">
                  <div
                    className={cn(
                      'text-primary-9 bg-neutral-1 border-neutral-2 border',
                      'rounded-2xl rounded-bl-sm px-3 py-2 text-xs leading-snug'
                    )}
                  >
                    {message.text}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-neutral-2 mt-1 flex items-center gap-2 rounded-lg border bg-[#fafafa] px-3 py-2">
        <input
          type="text"
          placeholder="Write a message..."
          disabled
          className={cn(
            'text-primary-9 placeholder:text-neutral-4 flex-1 bg-transparent text-xs outline-none',
            'disabled:cursor-not-allowed'
          )}
        />
        <button
          type="button"
          aria-label="Send"
          disabled
          className={cn(
            'bg-primary-9/40 grid size-6 place-items-center rounded-md text-white',
            'disabled:cursor-not-allowed'
          )}
        >
          <RiSendPlaneFill className="size-3" />
        </button>
      </div>
    </div>
  );
}

export default DiscussionThread;
