/* eslint-disable react/jsx-props-no-spreading */
import { Input as AInput, InputProps, Select as ASelect, SelectProps } from 'antd';
import { TextAreaProps } from 'antd/lib/input/TextArea';
import { classNames } from '@/util/utils';

const { TextArea: ATextArea } = AInput;

export function Input({ placeholder, className, ...props }: InputProps) {
  return (
    <AInput
      placeholder={placeholder}
      className={classNames(
        'rounded-none border-0 border-b border-gray-300 px-1 focus:ring-0',
        'placeholder:text-gray-400 hover:border-gray-400 focus:border-b-2 focus:border-primary-8',
        'focus-within:!border-b-2 focus-within:!border-primary-8 focus-within:!ring-0',
        '[&.ant-input-status-error]:!border-0 [&.ant-input-status-error]:!border-b-2 [&.ant-input-status-error]:!border-red-300',
        '[&.ant-input-status-error]:focus:!ring-0 ',
        className
      )}
      {...props}
    />
  );
}

export function TextArea({ placeholder, rows = 4, className, ...props }: TextAreaProps) {
  return (
    <ATextArea
      rows={rows}
      placeholder={placeholder}
      className={classNames(
        'rounded-none border-0 border-b border-gray-300 p-3 focus:ring-0',
        'placeholder:text-gray-400 hover:border-gray-400 focus:border-b-2 focus:border-primary-8',
        '[&.ant-input-status-error]:!border-0 [&.ant-input-status-error]:!border-b-2 [&.ant-input-status-error]:!border-pink-700',
        className
      )}
      {...props}
    />
  );
}

export function Select({ options, value, onChange, className, ...props }: SelectProps) {
  return (
    <ASelect
      className={classNames(
        'min-w-36 border-0 border-b border-primary-8 ring-0 focus:!border-b-2 [&.ant-select-focused]:border-b-2',
        'shadow-none ring-0 [&.ant-select-focused_.ant-select-selector]:!ring-0',
        '[&_.ant-select-selector]:!border-0 [&_.ant-select-selector]:focus:!ring-0',
        'placeholder:text-gray-400 hover:border-gray-400',
        className
      )}
      popupClassName="rounded-none shadow-md"
      placeholder="select virtual lab"
      options={options}
      value={value}
      onChange={onChange}
      {...props}
    />
  );
}
