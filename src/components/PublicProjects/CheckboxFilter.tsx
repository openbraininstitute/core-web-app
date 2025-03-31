'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function CheckboxFilter({
  value,
  setValue,
  name,
  dataNumber,
  link,
}: {
  value: boolean;
  setValue: (value: boolean) => void;
  name: string;
  dataNumber: number;
  link: string;
}) {
  const [isDisabled, setIsDisabled] = useState<boolean>(false);
  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.checked);
    setIsDisabled(!e.target.checked);
  };

  return (
    <div className="relative flex flex-row rounded-3xl border border-solid border-gray-300 px-4 py-2">
      <input
        type="checkbox"
        id={name}
        name={name}
        checked={value}
        onChange={(e) => handleOnChange(e)}
        className="mr-2 block"
      />
      <Link
        href={link}
        className="relative flex flex-row gap-x-3 text-base font-normal text-primary-9"
        style={{
          color: isDisabled ? 'gray' : '#002766',
        }}
      >
        <span className="block">{name}</span>
        <span className="block">({dataNumber})</span>
      </Link>
    </div>
  );
}
