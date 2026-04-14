import { CloseOutlined, InfoCircleFilled } from '@ant-design/icons';
import { Form, Input } from 'antd';
import React from 'react';

import { validateSingleNeuronSynapseGenerationFormula } from '@/api/small-scale-simulator';
import { cn } from '@/utils/css-class';

import { Label } from '../../label';

export function InputSynapseCountFormula() {
  const [displayFormulaHelp, toggleFormulaHelp] = React.useReducer((val) => !val, false);

  return (
    <div className="w-full">
      <div className="flex w-full flex-col">
        <div
          className={cn(
            'flex w-full items-center gap-2 pb-[8px]',
            displayFormulaHelp && 'justify-between'
          )}
        >
          {<Label text="Synapse distribution formula" required className="normal-case" />}
          {displayFormulaHelp ? (
            <CloseOutlined className="text-gray-300" onClick={toggleFormulaHelp} />
          ) : (
            <InfoCircleFilled className="text-gray-300" onClick={toggleFormulaHelp} />
          )}
        </div>
        <p
          className={cn(
            'transition-height text-sm font-light text-gray-400',
            displayFormulaHelp ? 'mb-4 h-full opacity-100' : 'mb-0 h-0 opacity-0'
          )}
        >
          Supports advanced math functions (e.g., sin(x), log(x), ...). <br />
          <a
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-7"
            href="https://docs.sympy.org/latest/index.html"
          >
            https://docs.sympy.org/latest/index.html
          </a>
        </p>
      </div>
      <input hidden readOnly name="distribution" value="formula" />
      <Form.Item
        name={['formula']}
        extra={<small className="font-light">x: distance from soma (µm)</small>}
        rules={[
          {
            required: true,
            message: 'Please provide a valid distribution formula!',
            async validator(_, value) {
              if (value) {
                const result = await validateSingleNeuronSynapseGenerationFormula(value);
                if (!result) return Promise.reject();
                return Promise.resolve();
              }
              if (!value) return Promise.reject();
            },
          },
        ]}
        validateTrigger="onBlur"
        className="[&_.ant-form-item-required]:w-full"
      >
        <Input
          placeholder="0.03*x*x + 0.004"
          size="large"
          className={cn(
            '[&_.ant-input]:text-primary-8 text-base font-bold italic [&_input]:placeholder:text-base! [&_input]:placeholder:font-light!',
            '[&_.ant-input]:border-neutral-2 [&_.ant-input]:border [&_.ant-input]:border-r-0 [&_.ant-input]:py-2',
            '[&_.ant-input-group-addon]:border-neutral-2 [&_.ant-input-group-addon]:border [&_.ant-input-group-addon]:py-2',
            '[&_.ant-input-group-addon]: [&_.ant-input-group-addon]:border-l-0 [&_.ant-input-group-addon]:bg-white'
          )}
          addonAfter={
            <span className="whitespace-nowrap text-gray-400 not-italic">Synapses/µm</span>
          }
        />
      </Form.Item>
    </div>
  );
}
