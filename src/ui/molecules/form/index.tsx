'use client';

import {
  createContext,
  type FormEvent,
  type ReactNode,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
} from 'react';

import { cn } from '@/utils/css-class';

/**
 * Tiny, dependency-free form layer for composing molecule controls.
 *
 * Why this exists: segments like workflows/ and contribute/ pull in antd
 * `Form` for state + validation. That's the only reason they import antd.
 * This primitive replaces that pattern: `useForm` + `<Form>` + `<Field>`
 * sit on top of `useState` and any of our molecules can be the control.
 *
 * Scope on purpose stays small:
 * - sync field-level validation (no async, no schema lib coupling)
 * - flat field map (nested objects via dot keys is left for callers)
 * - no field arrays (callers do their own iteration)
 *
 * For richer needs swap the underlying state to `react-hook-form` later —
 * the public API (`<Form>` / `<Field>`) can stay.
 */

type Values = Record<string, unknown>;

type FieldErrors<V extends Values> = Partial<Record<keyof V, string>>;

type ValidateFn<V extends Values> = (values: V) => FieldErrors<V> | null | undefined;

export interface UseFormReturn<V extends Values> {
  values: V;
  errors: FieldErrors<V>;
  touched: Partial<Record<keyof V, boolean>>;
  isSubmitting: boolean;
  setFieldValue: <K extends keyof V>(name: K, value: V[K]) => void;
  setFieldTouched: <K extends keyof V>(name: K, touched?: boolean) => void;
  reset: (next?: Partial<V>) => void;
  handleSubmit: (
    onValid: (values: V) => void | Promise<void>
  ) => (event?: FormEvent) => Promise<void>;
}

interface UseFormOptions<V extends Values> {
  defaultValues: V;
  validate?: ValidateFn<V>;
  validateOn?: 'change' | 'blur' | 'submit';
}

export function useForm<V extends Values>({
  defaultValues,
  validate,
  validateOn = 'blur',
}: UseFormOptions<V>): UseFormReturn<V> {
  const [values, setValues] = useState<V>(defaultValues);
  const [errors, setErrors] = useState<FieldErrors<V>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof V, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const runValidate = useCallback(
    (next: V): FieldErrors<V> => {
      if (!validate) return {};
      const result = validate(next);
      return result ?? {};
    },
    [validate]
  );

  const setFieldValue = useCallback(
    <K extends keyof V>(name: K, value: V[K]) => {
      setValues((prev) => {
        const next = { ...prev, [name]: value } as V;
        if (validateOn === 'change') setErrors(runValidate(next));
        return next;
      });
    },
    [runValidate, validateOn]
  );

  const setFieldTouched = useCallback(
    <K extends keyof V>(name: K, isTouched = true) => {
      setTouched((prev) => ({ ...prev, [name]: isTouched }));
      if (validateOn === 'blur') {
        setErrors(runValidate(values));
      }
    },
    [runValidate, validateOn, values]
  );

  const reset = useCallback(
    (next?: Partial<V>) => {
      setValues({ ...defaultValues, ...(next ?? {}) });
      setErrors({});
      setTouched({});
      setIsSubmitting(false);
    },
    [defaultValues]
  );

  const handleSubmit = useCallback(
    (onValid: (values: V) => void | Promise<void>) => async (event?: FormEvent) => {
      event?.preventDefault();
      const nextErrors = runValidate(values);
      setErrors(nextErrors);
      const allTouched = Object.keys(values).reduce<Partial<Record<keyof V, boolean>>>(
        (acc, key) => {
          acc[key as keyof V] = true;
          return acc;
        },
        {}
      );
      setTouched(allTouched);
      if (Object.keys(nextErrors).length > 0) return;
      try {
        setIsSubmitting(true);
        await onValid(values);
      } finally {
        setIsSubmitting(false);
      }
    },
    [runValidate, values]
  );

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setFieldValue,
    setFieldTouched,
    reset,
    handleSubmit,
  };
}

// biome-ignore lint/suspicious/noExplicitAny: context is intentionally erased; <Field> retypes via generic
const FormContext = createContext<UseFormReturn<any> | null>(null);

function useFormContext<V extends Values>(): UseFormReturn<V> {
  const ctx = useContext(FormContext);
  if (!ctx) throw new Error('Form components must be rendered inside <Form>');
  return ctx as UseFormReturn<V>;
}

interface FormProps<V extends Values>
  extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit'> {
  form: UseFormReturn<V>;
  onSubmit: (values: V) => void | Promise<void>;
}

export function Form<V extends Values>({
  form,
  onSubmit,
  className,
  children,
  ...props
}: FormProps<V>) {
  return (
    <FormContext.Provider value={form}>
      <form
        {...props}
        noValidate
        className={cn('flex flex-col gap-4', className)}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        {children}
      </form>
    </FormContext.Provider>
  );
}

interface FieldRenderProps<T> {
  id: string;
  name: string;
  value: T;
  onChange: (next: T) => void;
  onBlur: () => void;
  error: string | undefined;
  invalid: boolean;
}

interface FieldProps<V extends Values, K extends keyof V> {
  name: K;
  label?: ReactNode;
  hint?: ReactNode;
  className?: string;
  children: (props: FieldRenderProps<V[K]>) => ReactNode;
}

export function Field<V extends Values, K extends keyof V>({
  name,
  label,
  hint,
  className,
  children,
}: FieldProps<V, K>) {
  const form = useFormContext<V>();
  const id = useId();
  const fieldName = String(name);

  const value = form.values[name];
  const error = form.errors[name];
  const isTouched = !!form.touched[name];
  const invalid = !!error && isTouched;

  const onChange = useMemo(() => (next: V[K]) => form.setFieldValue(name, next), [form, name]);
  const onBlur = useMemo(() => () => form.setFieldTouched(name, true), [form, name]);

  return (
    <div data-slot="field" className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} data-slot="field-label" className="text-neutral-5 text-sm font-medium">
          {label}
        </label>
      )}
      {children({
        id,
        name: fieldName,
        value: value as V[K],
        onChange,
        onBlur,
        error: invalid ? error : undefined,
        invalid,
      })}
      {invalid && (
        <div data-slot="field-error" className="text-destructive text-xs">
          {error}
        </div>
      )}
      {!invalid && hint && (
        <div data-slot="field-hint" className="text-neutral-4 text-xs">
          {hint}
        </div>
      )}
    </div>
  );
}
