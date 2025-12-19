import { Explanation } from '@/components/explanation';
import { classNames } from '@/util/utils';
import styles from './validation-explanation.module.css';

export interface ValidationExplanationProps {
  className?: string;
  passed: boolean;
}

export function ValidationExplanation({ className, passed }: ValidationExplanationProps) {
  return (
    <Explanation
      title={
        <>
          <div>ME-Model Validation</div>
          <div className={passed ? styles.passed : styles.failed}>
            {passed ? 'passed' : 'failed'}
          </div>
        </>
      }
      className={classNames(styles.validationDescription, className)}
    >
      <p>
        ME-Model validation runs a series of validations to test the model quality. We calculate the
        threshold current (rheobase, if not present) and the input resistance of the model (Rin).
        The validations include:
      </p>
      <ol>
        <li>1. Hyperpolization Validation</li>
        <li>2. Input Resistance (Rin) Validation</li>
        <li>3. Spiking Validation</li>
        <li>4. AIS (Axon Initial Segment) Spiking Validation</li>
        <li>5. Depolarization Block Validation</li>
        <li>6. IV (Current-Voltage) Curve Validation</li>
        <li>7. FI (Frequency-Current) Curve Validation</li>
        <li>8. Back-propagating Action Potential (BPAP) Validation</li>
      </ol>
      <p>
        The output figures for each validation, along with the validation protocol descriptions and
        validation conditions, are provided below. An ME-model PASSES validation if all individual
        validations pass. The ME-model validation status only represents a qualitative assessment of
        the model. Even if the ME-model FAILS validation, you can still run simulations with the
        model.
      </p>
      <p>
        Note: The platform skips certain validations when a model lacks specific sections, such as
        AIS Validation when AIS is absent, and BPAP Validation when dendrites are missing in the
        model, and their figures do not appear in the list below.
      </p>
    </Explanation>
  );
}
