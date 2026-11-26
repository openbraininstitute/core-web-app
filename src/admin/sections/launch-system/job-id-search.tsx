'use client';

import { Input } from 'antd';
import { parseAsString, useQueryState } from 'nuqs';
import { useTransition } from 'react';

// Not shallow: the server looks the job up while it renders the page.
export function JobIdSearch() {
  const [pending, startTransition] = useTransition();
  const [jobId, setJobId] = useQueryState(
    'id',
    parseAsString.withDefault('').withOptions({ shallow: false, startTransition })
  );

  return (
    <Input.Search
      key={jobId}
      allowClear
      defaultValue={jobId}
      placeholder="Job ID"
      enterButton="Look up"
      loading={pending}
      onSearch={(value) => setJobId(value.trim() || null)}
      className="w-[32rem]! max-w-full"
    />
  );
}
