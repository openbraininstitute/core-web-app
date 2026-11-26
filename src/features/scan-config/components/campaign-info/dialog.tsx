'use client';

import { LoadingOutlined } from '@ant-design/icons';
import { useState } from 'react';

import { LAUNCH_GREEN } from '@/features/scan-config/components/shared/box-class';
import { GENERATE_CLICKABLE } from '@/features/scan-config/components/shared/task-launch-button';
import { Modal } from '@/ui/molecules/modal';
import { AiSparkles } from '@/ui/segments/project/brains-walkthrough/agent-ready';
import { cn } from '@/utils/css-class';

import type { ICampaignInfo } from './info-block';

const FIELD_CLASS =
  'w-full rounded-xl border border-neutral-3 bg-white px-3 py-2 text-sm text-primary-9 outline-none placeholder:text-neutral-4 focus:border-primary-7';

/**
 * The campaign's name and description, shown in the middle of the page as it is generated, to
 * fill in or to change, the page blurred behind. Both are needed. Cancel, Escape or a click
 * beside it puts it away, keeping what was typed.
 */
export function CampaignInfoDialog({
  initial,
  submitLabel,
  suggest,
  onCancel,
  onDone,
}: {
  /** What the config holds of the two already. */
  initial: ICampaignInfo;
  submitLabel: string;
  /** A name and description made from the config; without it there is no Suggest with AI. */
  suggest?: () => ICampaignInfo;
  /** Put away without generating: what was typed is handed over, to be kept. */
  onCancel: (typed: ICampaignInfo) => void;
  onDone: (info: ICampaignInfo) => void;
}) {
  const [name, setName] = useState(initial.campaign_name);
  const [description, setDescription] = useState(initial.campaign_description);
  const [thinking, setThinking] = useState(false);
  // On a phone near the top, clear of the keyboard, which waits for a tap. Read as it opens, by a click.
  const phone =
    typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 767px)').matches;
  const ready = !!name.trim() && !!description.trim();
  const cancel = () => onCancel({ campaign_name: name, campaign_description: description });

  const onSuggest = () => {
    if (!suggest) return;
    setThinking(true);
    // a moment's pause, as an assistant would take
    window.setTimeout(() => {
      const info = suggest();
      setName(info.campaign_name);
      setDescription(info.campaign_description);
      setThinking(false);
    }, 700);
  };

  return (
    <Modal
      open
      position={phone ? 'top' : 'center'}
      focusTrap={!phone}
      onClose={cancel}
      title={<span className="text-primary-9 text-base font-bold">Name your campaign</span>}
      closable={false}
      size="auto"
      className="ring-primary-9/5 w-[460px] max-w-[calc(100vw-2rem)] rounded-3xl shadow-[0_24px_60px_-16px_rgb(0_39_102/0.35)] ring-1"
      overlayClassName="bg-[rgb(240_243_248/0.45)] backdrop-blur-md"
      headerClassName="px-6 pt-6 pb-0"
      bodyClassName="max-h-[calc(100vh-4rem)] px-6 pt-0 pb-6"
    >
      <form
        data-testid="scan-config-campaign-info"
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!ready) return;
          onDone({ campaign_name: name.trim(), campaign_description: description.trim() });
        }}
      >
        <span className="text-xs text-neutral-500">Both are needed before it is generated.</span>
        <label className="flex flex-col gap-1">
          <span className="text-primary-9 text-xs font-semibold">Campaign name</span>
          <input
            // spelled out for the modal, which gives its first control the focus as it opens
            type="text"
            data-testid="scan-config-campaign-info-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. VPM replay into the barrel column"
            className={FIELD_CLASS}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-primary-9 text-xs font-semibold">Description</span>
          <textarea
            data-testid="scan-config-campaign-info-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="What this campaign is for"
            className={cn(FIELD_CLASS, 'resize-none')}
          />
        </label>
        <div className="mt-1 flex items-center justify-end gap-2">
          {suggest && (
            <button
              type="button"
              onClick={onSuggest}
              disabled={thinking}
              className="border-primary-9/20 text-primary-9 hover:bg-primary-9/5 mr-auto flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60"
            >
              {thinking ? (
                <LoadingOutlined className="text-[12px]" />
              ) : (
                <AiSparkles className="size-3.5" />
              )}
              Suggest with AI
            </button>
          )}
          <button
            type="button"
            onClick={cancel}
            className="text-primary-9 rounded-full px-4 py-2 text-sm font-semibold hover:bg-neutral-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            data-testid="scan-config-campaign-info-submit"
            // not `disabled`, which would leave the modal's focus trap without its last stop
            aria-disabled={!ready}
            className={cn(
              'rounded-full px-5 py-2 text-sm font-semibold',
              ready
                ? `${LAUNCH_GREEN} ${GENERATE_CLICKABLE} text-white`
                : 'cursor-default bg-gray-200 text-gray-500'
            )}
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
