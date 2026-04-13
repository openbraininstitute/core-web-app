'use client';

import { useRouter } from '@bprogress/next';
import { Form } from 'antd';

import { Button } from '@/ui/molecules/button';
import { makeSelectContributionEntityClickEvent } from '@/ui/segments/contribute/event';
import { useContributionPipeline } from '@/ui/segments/contribute/shared/pipeline/context';
import { cn } from '@/utils/css-class';

import type { ZodObject, ZodRawShape } from 'zod';
import type { IContributionFormConfig } from '@/ui/segments/contribute/shared/types';

interface ISubmitButtonProps<
  TFormValues extends Record<string, unknown>,
  TSchema extends ZodObject<ZodRawShape>,
> {
  loading: boolean;
  createdEntityId?: string;
  config: IContributionFormConfig<TFormValues, TSchema>;
  virtualLabId: string;
  projectId: string;
  onSubmit: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => Promise<void>;
}

export function SubmitButton<
  TFormValues extends Record<string, unknown>,
  TSchema extends ZodObject<ZodRawShape>,
>({
  loading,
  createdEntityId,
  config,
  virtualLabId,
  projectId,
  onSubmit,
}: ISubmitButtonProps<TFormValues, TSchema>) {
  const router = useRouter();
  const { form } = useContributionPipeline<TFormValues>();
  const values = Form.useWatch([], form);

  const isValidForm = config.schema.safeParse(values).success;
  const detailsUrl = createdEntityId
    ? config.buildDetailsUrl({
        entityId: createdEntityId,
        virtualLabId,
        projectId,
      })
    : null;

  if (detailsUrl === '__NO_DETAILS_URL__') {
    return null;
  }
  if (detailsUrl) {
    return (
      <Form.Item className="mb-0!">
        <Button
          rounded
          type="button"
          variant="default"
          size="lg"
          className={cn(
            'disabled:bg-neutral-1 disabled:text-neutral-3!',
            'px-10 select-none hover:text-white disabled:cursor-not-allowed'
          )}
          onClick={() => {
            makeSelectContributionEntityClickEvent({
              display: false,
              entityType: null,
              sessionId: null,
            });
            router.push(detailsUrl);
          }}
        >
          View Details
        </Button>
      </Form.Item>
    );
  }

  return (
    <Form.Item className="mb-0!">
      <Button
        disabled={!isValidForm || loading}
        rounded
        type="submit"
        variant="success"
        size="lg"
        className={cn(
          'disabled:bg-neutral-1 disabled:text-neutral-3!',
          'px-10 select-none hover:text-white disabled:cursor-not-allowed'
        )}
        onClick={onSubmit}
      >
        Confirm
      </Button>
    </Form.Item>
  );
}
