import { CopyOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { Fragment, useMemo, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

import { isPlainObject } from '../../utils';
import NumberEditor from './number-editor';

import type React from 'react';
import type { ConfigValue } from '@/features/scan-config/types';

export default function NeuronIds({
  value,
  disabled,
  onAddIds,
}: {
  value: ConfigValue;
  disabled: boolean;
  onAddIds: (newElements: number[] | null) => void;
}) {
  const [edit, setEdit] = useState(false);

  const allElements = useMemo(() => {
    const namedTupleArray = Array.isArray(value) ? value : [value];

    const elements: number[] = namedTupleArray.flatMap((v) => {
      if (isPlainObject(v) && Array.isArray(v.elements)) {
        return v.elements as number[];
      }
      return [];
    });

    // Remove duplicates and sort
    return [...new Set(elements)].sort((a, b) => a - b);
  }, [value]);

  const [text, setText] = useState(allElements.join(', '));
  const [isTextValid, setIsTextValid] = useState(true);

  const renderedElements = useMemo(() => {
    const total = allElements.length;
    const LIMIT = 12;

    if (total <= LIMIT * 2) {
      return {
        head: allElements,
        tail: [],
      };
    }

    return {
      head: allElements.slice(0, LIMIT),
      tail: allElements.slice(-LIMIT),
    };
  }, [allElements]);

  const handleEditClick = () => {
    setEdit(true);
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {!edit && (
        <Ids
          ids={renderedElements}
          totalIds={allElements.length}
          onEditClick={handleEditClick}
          disabled={disabled}
          onDeleteItem={(deleteId: number) => {
            const newAllElements = allElements.filter((id) => id !== deleteId);
            onAddIds(newAllElements);
            setText(newAllElements.join(', '));
          }}
        />
      )}
      {!edit && (
        <div className="flex gap-2 justify-end">
          {!disabled && (
            <>
              <button
                type="button"
                className="text-gray-500  flex justify-center items-center py-2 rounded-full text-primary-9 text-sm gap-3"
                onClick={() => {
                  onAddIds(null);
                  setText('');
                }}
              >
                Clear list
              </button>
              <button
                type="button"
                className="text-gray-500  flex justify-center items-center border border-gray-200 p-2 rounded-full text-primary-9 text-sm gap-3"
                onClick={handleEditClick}
              >
                Edit ID list <EditOutlined className="text-xs" />
              </button>
            </>
          )}
          <CopyButton textToCopy={text} />
        </div>
      )}

      {!edit && !disabled && (
        <HighlightedInput
          maxLength={1000}
          handleAddIdsClick={(ids) => {
            const newAllElements = [...new Set([...allElements, ...ids])].sort((a, b) => a - b);
            onAddIds(newAllElements);
            setText(newAllElements.join(', '));
          }}
        />
      )}
      {edit && (
        <NumberEditor
          value={text}
          setIsTextValid={setIsTextValid}
          setValue={setText}
          disabled={disabled}
        />
      )}
      {edit && (
        <div className="flex gap-2 mt-3 justify-end">
          <Button
            className="border-none bg-transparent text-primary-8"
            onClick={() => {
              setEdit(!edit);
            }}
          >
            Cancel
          </Button>
          {
            <Button
              className="text-primary-8 rounded-full font-bold"
              onClick={() => {
                if (edit && isTextValid) {
                  const values = parseCsvIntegers(text);
                  onAddIds(values);
                  setText(values.join(', '));
                }
                setEdit(!edit);
              }}
              disabled={!isTextValid || disabled}
            >
              Apply
            </Button>
          }
        </div>
      )}
    </div>
  );
}

function parseCsvIntegers(data: string): number[] {
  if (!data) return [];

  const result = new Set<number>();
  const len = data.length;
  let current = 0;
  let hasDigit = false;

  for (let i = 0; i < len; i++) {
    const charCode = data.charCodeAt(i);

    // Character codes for '0'-'9' are 48-57
    if (charCode >= 48 && charCode <= 57) {
      current = current * 10 + (charCode - 48);
      hasDigit = true;
      continue;
    }

    // Delimiters: comma (44), newline (10), carriage return (13), space (32)
    if (charCode === 44 || charCode === 10 || charCode === 13 || charCode === 32) {
      if (hasDigit) {
        result.add(current);
        current = 0;
        hasDigit = false;
      }
      continue;
    }

    throw new Error('Invalid integer');
  }

  if (hasDigit) {
    result.add(current);
  }

  return Array.from(result).sort((a, b) => a - b);
}

const Ids = ({
  ids,
  onEditClick,
  disabled,
  onDeleteItem,
  totalIds,
}: {
  ids: { head: number[]; tail: number[] };
  totalIds: number;
  onDeleteItem: (id: number) => void;
  onEditClick?: () => void;
  disabled?: boolean;
}) => {
  const containerClass = 'w-full grid grid-cols-4 gap-1';
  const elementClass =
    'border border-gray-200 rounded-full py-1 px-0 text-primary-8 font-bold flex items-center justify-center gap-1 text-xs';

  return (
    <div className="border border-gray-200 p-3 rounded-lg w-full ">
      <div className="relative -top-[5px] text-primary-8 text-sm">{`${totalIds} ${totalIds === 1 ? 'ID' : 'IDs'}`}</div>
      <div className={containerClass}>
        {ids.head.map((id) => (
          <div key={id} className={elementClass}>
            {id}
            {!disabled && <DeleteOutlined onClick={() => onDeleteItem(id)} />}
          </div>
        ))}
      </div>

      {ids.tail.length > 0 && (
        <div className="w-full flex justify-center my-3">
          <button
            type="button"
            className="text-gray-500 flex justify-center items-center border border-gray-200 py-2 rounded-full text-primary-9 w-[100px] text-sm"
            onClick={onEditClick}
          >
            {!disabled ? 'View/Edit all IDs' : 'View all IDs'}
          </button>
        </div>
      )}

      {ids.tail.length > 0 && (
        <div className={containerClass}>
          {ids.tail.map((id) => (
            <div key={id} className={elementClass}>
              {id}
              {!disabled && <DeleteOutlined onClick={() => onDeleteItem(id)} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CopyButton = ({ textToCopy }: { textToCopy: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // biome-ignore lint/suspicious/noConsole: Error logging required
      console.error('Clipboard write failed:', err);
    }
  };

  return (
    <button
      type="button"
      className="text-gray-500 flex justify-center items-center border border-gray-200 py-2 rounded-full text-primary-9 w-[100px] text-sm gap-3"
      onClick={handleCopy}
    >
      {copied ? 'Copied!' : 'Copy ID list'} <CopyOutlined className="text-xs" />
    </button>
  );
};

const HighlightedInput = ({
  handleAddIdsClick,
  maxLength = 1000,
}: {
  handleAddIdsClick: (ids: number[]) => void;
  maxLength: number;
}) => {
  const [value, setValue] = useState<string>('');
  const [error, setError] = useState('');
  const backdropRef = useRef<HTMLDivElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    if (newValue.length > maxLength) return;

    setValue(newValue);

    const segments = newValue.split(',');
    const hasInvalidSegment = segments.some((segment) => {
      const isValid = /^\s*\d*\s*$/.test(segment);
      return !isValid && segment.trim() !== '';
    });

    if (hasInvalidSegment) {
      setError('Invalid input: Please enter only numbers and commas.');
    } else {
      setError('');
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLInputElement>) => {
    if (backdropRef.current) {
      backdropRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const renderHighlights = () => {
    const segments = value.split(',');

    return segments.map((segment, index) => {
      const isLast = index === segments.length - 1;
      const isValid = /^\s*\d*\s*$/.test(segment);

      return (
        // biome-ignore lint/suspicious/noArrayIndexKey: intentional
        <Fragment key={index}>
          <span
            className={
              !isValid ? 'bg-red-100 text-red-600 ring-2 ring-red-100 rounded-sm' : 'text-gray-800'
            }
          >
            {segment}
          </span>
          {!isLast && <span className="text-gray-800">,</span>}
        </Fragment>
      );
    });
  };

  const disabled = !!error || value === '';

  return (
    <div>
      <div className="grid w-full grid-cols-10 gap-2">
        <div className="relative border border-gray-200 rounded-md focus-within:ring-1 focus-within:border-0 focus-within:ring-gray-200 bg-white overflow-hidden flex items-center col-span-7">
          <div
            ref={backdropRef}
            className="absolute inset-0 px-3 py-2 font-mono text-sm whitespace-pre overflow-hidden pointer-events-none z-0"
            aria-hidden="true"
          >
            {renderHighlights()}
          </div>

          <input
            type="text"
            value={value}
            onChange={handleChange}
            onScroll={handleScroll}
            maxLength={maxLength}
            className="w-full px-3 py-2 font-mono text-sm text-transparent bg-transparent caret-black outline-none block z-10 placeholder:text-xs"
            spellCheck={false}
            placeholder="Type your comma separated list of IDs"
            title="Type your comma separated list of IDs"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();

                if (disabled) return;
                const ids = parseCsvIntegers(value);
                handleAddIdsClick(ids);
                setValue('');
              }
            }}
          />
        </div>
        <button
          type="button"
          className={cn(
            'col-span-3 border border-gray-200 px-2 rounded-full',
            disabled ? 'text-gray-200' : 'text-green-600'
          )}
          disabled={disabled}
          onClick={() => {
            if (disabled) return;
            const ids = parseCsvIntegers(value);
            handleAddIdsClick(ids);
            setValue('');
          }}
        >
          Add IDs
        </button>
      </div>

      <div className="flex justify-between items-start px-1">
        <div className="text-red-500 text-sm">{error}</div>
        <div
          className={cn(
            'text-xs font-mono transition-colors ml-auto',
            value.length >= maxLength ? 'text-red-500 font-bold' : 'text-gray-400'
          )}
        >
          {value.length} / {maxLength} characters
        </div>
      </div>
    </div>
  );
};
