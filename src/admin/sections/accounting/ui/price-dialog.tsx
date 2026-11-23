'use client';

import { Button, DatePicker, Form, Input, InputNumber, Modal, Select } from 'antd';
import dayjs from 'dayjs';
import { useRef, useState } from 'react';

import { adminQueryKeys } from '../../../query-keys';
import { REQUIRED } from '../../../shared/form-modal';
import { dateTimeItemProps, lockWhilePending } from '../../../shared/form-props';
import { useAdminWrite } from '../../../shared/use-admin-write';
import {
  closesDialog,
  endField,
  isCurrent,
  priceBody,
  SERVICE_TYPE_LABELS,
  SERVICE_TYPE_OPTIONS,
  START_AHEAD_MS,
  SUBTYPE_OPTIONS,
  schemaRule,
  startField,
} from '../helpers';
import { LEGACY_SUBTYPES, MAX_QUANTITY, MAX_TIERS, PriceBody, PriceDecimal } from '../schemas';
import { ChargeType } from '../types';
import { CostExamples, PriceTiersTable } from './price-parts';
import { usePricesFor } from './queries';

import type { Rule } from 'antd/es/form';
import type { TPriceBody, TPriceValues } from '../types';

const CURRENT_SUBTYPES = SUBTYPE_OPTIONS.filter(({ value }) => !LEGACY_SUBTYPES.includes(value));

const DECIMAL = schemaRule(PriceDecimal);

const startsAhead: Rule = {
  validator: async (_, value?: string) => {
    if (value && dayjs(value).isBefore(dayjs().add(START_AHEAD_MS, 'ms'))) {
      throw new Error('Has to start at least 5 minutes from now, so the old price can end then');
    }
  },
};

const tierEnd: Rule = {
  validator: async (_, value?: number | null) => {
    if (value == null) throw new Error('Required');
    if (value > MAX_QUANTITY) throw new Error(`At most ${MAX_QUANTITY}`);
  },
};

const afterPrevious =
  (index: number): Rule =>
  ({ getFieldValue }) => ({
    validator: async (_, value?: number | null) => {
      const from = index === 0 ? 0 : getFieldValue(['tiers', index - 1, 'to']);
      if (value != null && from != null && value <= from) {
        throw new Error(`Has to be more than ${from}`);
      }
    },
  });

function OtherPrices({ body, priceId }: { body: TPriceBody; priceId?: number }) {
  const prices = usePricesFor(body);
  if (prices.isPending) return <p className="text-neutral-4">Looking for other prices…</p>;
  if (prices.isError) return <p className="text-destructive">Couldn't check for other prices.</p>;
  const others = prices.data.data.filter((price) => price.id !== priceId && isCurrent(price));
  const scope = body.vlab_id ? ' for this lab' : ' by default';
  if (!others.length) {
    return (
      <p>
        No other current or scheduled {body.service_subtype} price{scope}. Check the type and
        subtype: accounting can't delete a price.
      </p>
    );
  }
  return (
    <p>
      {others.length} other current or scheduled {body.service_subtype}{' '}
      {others.length === 1 ? 'price' : 'prices'}
      {scope}. At any time, the one that started last applies.
    </p>
  );
}

/** Edit, then review with costs; a default price needs its subtype typed to save. */
export function PriceDialog<Result>({
  title,
  vlabId,
  priceId,
  initialValues,
  keyLocked = false,
  startAhead = false,
  okText,
  write: send,
  done,
  failed,
  onClose,
}: {
  title: string;
  vlabId: string | null;
  priceId?: number;
  initialValues?: Partial<TPriceValues>;
  keyLocked?: boolean;
  startAhead?: boolean;
  okText: string;
  write: (body: TPriceBody) => Promise<Result>;
  done: string | ((result: Result) => string);
  failed: string;
  onClose: () => void;
}) {
  const [form] = Form.useForm<TPriceValues>();
  const [review, setReview] = useState<TPriceBody | null>(null);
  const startsNow = useRef(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [confirm, setConfirm] = useState('');
  const write = useAdminWrite({
    refreshes: adminQueryKeys.accounting(),
    write: send,
    done,
    failed,
    onSuccess: onClose,
  });
  const pending = write.isPending;
  const type = Form.useWatch('service_type', form);
  const storage = type === ChargeType.Storage;
  const needsConfirm = vlabId === null;
  const confirmed = !needsConfirm || confirm === review?.service_subtype;
  const start = startField(keyLocked);
  const end = endField();

  const toReview = (values: TPriceValues) => {
    const body = priceBody(values, vlabId);
    const parsed = PriceBody.safeParse(body);
    if (!parsed.success) {
      setProblem(parsed.error.issues[0].message);
      return;
    }
    setProblem(null);
    setConfirm('');
    startsNow.current = !values.valid_from;
    setReview(body);
  };

  const save = () => {
    if (!review || pending || !confirmed) return;
    write.mutate(startsNow.current ? { ...review, valid_from: new Date().toISOString() } : review, {
      onError: (error) => {
        if (closesDialog(error)) onClose();
      },
    });
  };

  return (
    <Modal
      open
      title={title}
      width={760}
      {...lockWhilePending(pending, onClose)}
      footer={[
        <Button key="cancel" disabled={pending} onClick={onClose}>
          Cancel
        </Button>,
        review && (
          <Button key="back" disabled={pending} onClick={() => setReview(null)}>
            Back
          </Button>
        ),
        <Button
          key="ok"
          type="primary"
          loading={pending}
          disabled={!!review && !confirmed}
          onClick={() => (review ? save() : form.submit())}
        >
          {review ? okText : 'Review'}
        </Button>,
      ]}
    >
      <div hidden={!!review}>
        <Form
          form={form}
          layout="vertical"
          requiredMark={false}
          initialValues={{ tiers: [{}], ...initialValues }}
          onFinish={toReview}
        >
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item name="service_type" label="Type" rules={[REQUIRED]}>
              <Select
                options={SERVICE_TYPE_OPTIONS}
                disabled={keyLocked}
                onChange={(next) => {
                  if (next === ChargeType.Storage) {
                    form.setFieldValue('tiers', [form.getFieldValue(['tiers', 0]) ?? {}]);
                  }
                }}
              />
            </Form.Item>
            <Form.Item name="service_subtype" label="Subtype" rules={[REQUIRED]}>
              <Select
                showSearch
                optionFilterProp="label"
                options={CURRENT_SUBTYPES}
                disabled={keyLocked}
              />
            </Form.Item>
            <Form.Item
              name={start.name}
              label={start.label}
              extra={start.extra}
              rules={[...(start.rules ?? []), ...(startAhead ? [startsAhead] : [])]}
              {...dateTimeItemProps}
            >
              <DatePicker showTime className="w-full" />
            </Form.Item>
            <Form.Item
              name={end.name}
              label={end.label}
              extra={end.extra}
              dependencies={end.dependencies}
              rules={end.rules}
              {...dateTimeItemProps}
            >
              <DatePicker showTime className="w-full" />
            </Form.Item>
          </div>
          <Form.List name="tiers">
            {(fields, { add, remove }) => (
              <div className="flex flex-col gap-2">
                <div className="text-neutral-4 grid grid-cols-[6rem_1fr_1fr_1fr_5rem] gap-3 text-sm">
                  <span>From</span>
                  <span>To</span>
                  <span>{storage ? '' : 'Fixed cost'}</span>
                  <span>{storage ? 'Per byte-second' : 'Per unit'}</span>
                  <span />
                </div>
                {fields.map((field, index) => {
                  const last = index === fields.length - 1;
                  return (
                    <div
                      key={field.key}
                      className="grid grid-cols-[6rem_1fr_1fr_1fr_5rem] items-start gap-3"
                    >
                      <Form.Item noStyle dependencies={[['tiers', index - 1, 'to']]}>
                        {({ getFieldValue }) => (
                          <span className="pt-1 font-mono">
                            {index === 0 ? 0 : (getFieldValue(['tiers', index - 1, 'to']) ?? '…')}
                          </span>
                        )}
                      </Form.Item>
                      {last ? (
                        <span className="text-neutral-4 pt-1">and above</span>
                      ) : (
                        <Form.Item
                          name={[field.name, 'to']}
                          dependencies={index > 0 ? [['tiers', index - 1, 'to']] : undefined}
                          rules={[tierEnd, afterPrevious(index)]}
                        >
                          <InputNumber
                            aria-label={`Tier ${index + 1} ends at`}
                            min={1}
                            precision={0}
                            className="w-full"
                          />
                        </Form.Item>
                      )}
                      {storage ? (
                        <span />
                      ) : (
                        <Form.Item name={[field.name, 'fixed_cost']} rules={[DECIMAL]}>
                          <InputNumber<string>
                            aria-label={`Tier ${index + 1} fixed cost`}
                            stringMode
                            min="0"
                            placeholder="0"
                            className="w-full"
                          />
                        </Form.Item>
                      )}
                      <Form.Item name={[field.name, 'multiplier']} rules={[REQUIRED, DECIMAL]}>
                        <InputNumber<string>
                          aria-label={`Tier ${index + 1} rate`}
                          stringMode
                          min="0"
                          placeholder="0.05"
                          className="w-full"
                        />
                      </Form.Item>
                      {fields.length > 1 ? (
                        <Button type="link" onClick={() => remove(field.name)}>
                          Remove
                        </Button>
                      ) : (
                        <span />
                      )}
                    </div>
                  );
                })}
                {!storage && fields.length < MAX_TIERS && (
                  <Button className="self-start" onClick={() => add({})}>
                    Add a tier
                  </Button>
                )}
              </div>
            )}
          </Form.List>
          {problem && <p className="text-destructive mt-3">{problem}</p>}
        </Form>
      </div>
      {review && (
        <div className="flex flex-col gap-4">
          <p className="text-primary-9">
            {SERVICE_TYPE_LABELS[review.service_type]} · {review.service_subtype} ·{' '}
            {review.vlab_id ? 'this lab' : 'default for every lab without its own price'}
          </p>
          <PriceTiersTable type={review.service_type} tiers={review.tiers} />
          <div>
            <p className="text-neutral-4 mb-1 text-sm">Cost before any lab discount</p>
            <CostExamples type={review.service_type} tiers={review.tiers} />
          </div>
          <OtherPrices body={review} priceId={priceId} />
          {needsConfirm && (
            <div className="flex flex-col gap-1">
              <label htmlFor="price-confirm">
                Every lab without its own price pays this. Type{' '}
                <span className="font-mono">{review.service_subtype}</span> to confirm.
              </label>
              <Input
                id="price-confirm"
                value={confirm}
                disabled={pending}
                onChange={(event) => setConfirm(event.target.value)}
                onPressEnter={save}
              />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
