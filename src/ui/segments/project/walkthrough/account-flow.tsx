'use client';

import { RiArrowLeftLine, RiCheckLine, RiCloseLine } from '@remixicon/react';
import { useEffect, useRef, useState } from 'react';

import ObiLogo from '@/features/learn/components/ui/ObiLogo';
import { cn } from '@/utils/css-class';

import styles from './account-flow.module.css';

import type { FormEvent, ReactNode } from 'react';

/**
 * A dummy account, for trying the sign-up and log-in flows out: nothing is sent anywhere and no one is
 * signed in. Kept in this browser, so that the page shows it as signed in until it is signed out.
 */
export interface IDummyAccount {
  firstName: string;
  lastName: string;
  email: string;
  labName: string;
  projectName: string;
}

const STORED = 'walkthrough/dummy-account';

export function readDummyAccount(): IDummyAccount | null {
  try {
    const raw = localStorage.getItem(STORED);
    return raw ? (JSON.parse(raw) as IDummyAccount) : null;
  } catch {
    return null;
  }
}

function keepDummyAccount(account: IDummyAccount | null) {
  try {
    if (account) localStorage.setItem(STORED, JSON.stringify(account));
    else localStorage.removeItem(STORED);
  } catch {
    // Not kept, then: it lasts as long as the page.
  }
}

/** The test accounts the dummy Google chooser offers. */
const TEST_ACCOUNTS = [
  { firstName: 'Test', lastName: 'User', email: 'test.user@example.org' },
  { firstName: 'Alex', lastName: 'Example', email: 'alex@example.org' },
];

const SETUP = ['Creating your Virtual Lab', 'Setting up your first project', 'Adding 100 free credits'];

type TStep =
  | 'details'
  | 'login'
  | 'google'
  | 'signing-in'
  | 'verify'
  | 'creating'
  | 'welcome'
  | 'welcome-back';

/** The sign-up steps, for the count over each. */
const SIGN_UP_STEPS: TStep[] = ['details', 'verify'];

const FIELD =
  'w-full rounded-[10px] border border-neutral-300 bg-white px-[14px] py-[11px] text-[15px] leading-[20px] text-primary-9 outline-none transition-colors placeholder:text-neutral-400 focus:border-primary-9';
const LABEL = 'flex flex-col gap-[6px] text-[12px] leading-[16px] font-semibold text-neutral-600';
const PRIMARY =
  'bg-green-main rounded-full px-[22px] py-[13px] text-[15px] leading-[20px] font-semibold text-white shadow-[0_4px_14px_rgba(0,140,5,0.25)] transition-[filter] hover:brightness-110 disabled:opacity-50';
const NAVY =
  'bg-primary-9 hover:bg-primary-8 rounded-full px-[22px] py-[13px] text-[15px] leading-[20px] font-semibold text-white transition-colors';
const OUTLINED =
  'border-primary-9 text-primary-9 hover:bg-primary-9 rounded-full border-[1.5px] px-[22px] py-[12px] text-[15px] leading-[20px] font-semibold transition-colors hover:text-white';
const NOTE = 'text-[12px] leading-[16px] text-neutral-400';

/**
 * Signing up, or logging in, without leaving the page, and without signing anyone in: a dummy flow to
 * try out. Everything behind falls away to white and the form comes up in the middle of it: an account
 * from a dummy Google chooser, or from a name and email confirmed with any six digits; then what brings
 * the person here; then their Virtual Lab and first project; then a welcome, and the way in.
 */
export function AccountFlow({
  mode,
  onClose,
  onSignedIn,
  onEnter,
  onLearn,
}: {
  /** Which flow is open, if either. */
  mode: 'signup' | 'login' | null;
  onClose: () => void;
  onSignedIn: (account: IDummyAccount) => void;
  /** The platform, from the welcome. */
  onEnter: () => void;
  /** The course, from the welcome. */
  onLearn: () => void;
}) {
  const open = mode !== null;
  const [step, setStep] = useState<TStep>('details');
  const [account, setAccount] = useState<IDummyAccount>({
    firstName: '',
    lastName: '',
    email: '',
    labName: '',
    projectName: 'My first project',
  });
  // Where the Google chooser and the code lead back to: the sign-up, or the log-in.
  const [flow, setFlow] = useState<'signup' | 'login'>('signup');

  // Opened afresh each time, at its first step.
  useEffect(() => {
    if (!mode) return;
    setFlow(mode);
    setStep(mode === 'signup' ? 'details' : 'login');
  }, [mode]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [open, onClose]);

  const signedIn = (next: IDummyAccount) => {
    keepDummyAccount(next);
    onSignedIn(next);
  };

  // From the dummy Google chooser: a moment's signing in, then on, past the code.
  const chooseTest = (picked: (typeof TEST_ACCOUNTS)[number]) => {
    const next = { ...account, ...picked, labName: account.labName || `${picked.firstName}'s Lab` };
    setAccount(next);
    setStep('signing-in');
    setTimeout(() => {
      if (flow === 'login') {
        signedIn(readDummyAccount() ?? next);
        setStep('welcome-back');
      } else setStep('creating');
    }, 900);
  };

  const back: Partial<Record<TStep, TStep>> = {
    verify: flow === 'signup' ? 'details' : 'login',
    google: flow === 'signup' ? 'details' : 'login',
  };
  const counted = SIGN_UP_STEPS.indexOf(step);

  return (
    <div
      role="dialog"
      aria-modal
      aria-label={flow === 'signup' ? 'Sign up' : 'Log in'}
      inert={!open || undefined}
      className={cn(
        'fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-white px-[20px] py-[40px] transition-opacity duration-500 ease-out',
        open ? 'opacity-100' : 'pointer-events-none opacity-0'
      )}
    >
      <div className="absolute top-[24px] right-[clamp(20px,3vw,40px)] left-[clamp(20px,3vw,40px)] flex items-center justify-between">
        {back[step] ? (
          <button
            type="button"
            onClick={() => setStep(back[step]!)}
            className="hover:text-primary-9 flex items-center gap-[6px] rounded-full px-[10px] py-[6px] text-[13px] font-semibold text-neutral-500 transition-colors hover:bg-neutral-100"
          >
            <RiArrowLeftLine className="size-[16px]" /> Back
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="hover:text-primary-9 flex size-[36px] items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100"
        >
          <RiCloseLine className="size-[22px]" />
        </button>
      </div>

      {open && (
        <div key={step} className={cn(styles.step, 'flex w-full max-w-[460px] flex-col gap-[18px]')}>
          {flow === 'signup' && counted >= 0 && (
            <div className="flex items-center gap-[10px]">
              <span className="text-[11px] font-semibold tracking-[0.14em] text-neutral-400 uppercase">
                Step {counted + 1} of {SIGN_UP_STEPS.length}
              </span>
              <span className="h-[3px] flex-1 overflow-hidden rounded-full bg-neutral-100">
                <span
                  className="bg-primary-9 block h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${((counted + 1) / SIGN_UP_STEPS.length) * 100}%` }}
                />
              </span>
            </div>
          )}
          {step === 'details' && (
            <Details
              account={account}
              onGoogle={() => setStep('google')}
              onLogin={() => {
                setFlow('login');
                setStep('login');
              }}
              onDone={(next) => {
                setAccount({ ...next, labName: next.labName || `${next.firstName}'s Lab` });
                setStep('verify');
              }}
            />
          )}
          {step === 'login' && (
            <Login
              email={account.email}
              onGoogle={() => setStep('google')}
              onSignUp={() => {
                setFlow('signup');
                setStep('details');
              }}
              onDone={(email) => {
                setAccount((now) => ({ ...now, email }));
                setStep('verify');
              }}
            />
          )}
          {step === 'google' && <GoogleChooser onChoose={chooseTest} onOther={() => setStep(back.google!)} />}
          {step === 'signing-in' && <Working text="Signing you in…" />}
          {step === 'verify' && (
            <Verify
              email={account.email}
              onDone={() => {
                if (flow === 'login') {
                  const known = readDummyAccount();
                  signedIn(
                    known?.email === account.email
                      ? known
                      : { ...account, firstName: account.email.split('@')[0], labName: 'Your Lab' }
                  );
                  setStep('welcome-back');
                } else setStep('creating');
              }}
            />
          )}
          {step === 'creating' && (
            <Creating
              onDone={() => {
                signedIn(account);
                setStep('welcome');
              }}
            />
          )}
          {step === 'welcome' && (
            <Welcome account={account} back={false} onEnter={onEnter} onLearn={onLearn} />
          )}
          {step === 'welcome-back' && (
            <Welcome account={readDummyAccount() ?? account} back onEnter={onEnter} onLearn={onLearn} />
          )}
        </div>
      )}
    </div>
  );
}

function Heading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-[6px]">
      <h2 className="text-primary-9 text-[30px] leading-[1.15] font-bold tracking-[-0.02em]">{title}</h2>
      {children && <p className="text-[14px] leading-[1.5] text-neutral-500">{children}</p>}
    </div>
  );
}

/** The dummy Google sign-in, and the line between it and the email. */
function GoogleButton({ onClick }: { onClick: () => void }) {
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        className="text-primary-9 hover:border-primary-9 flex items-center justify-center gap-[10px] rounded-full border border-neutral-300 px-[22px] py-[12px] text-[15px] leading-[20px] font-semibold transition-colors"
      >
        <span className="flex size-[22px] items-center justify-center rounded-full bg-neutral-100 text-[12px] font-bold">
          G
        </span>
        Continue with Google
        <span className="rounded-full bg-amber-100 px-[7px] py-[1px] text-[10px] font-semibold tracking-[0.08em] text-amber-700 uppercase">
          Test
        </span>
      </button>
      <div className="flex items-center gap-[12px] text-[12px] text-neutral-400">
        <span className="h-px flex-1 bg-neutral-200" /> or with your email <span className="h-px flex-1 bg-neutral-200" />
      </div>
    </>
  );
}

function Details({
  account,
  onGoogle,
  onLogin,
  onDone,
}: {
  account: IDummyAccount;
  onGoogle: () => void;
  onLogin: () => void;
  onDone: (account: IDummyAccount) => void;
}) {
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => first.current?.focus(), []);
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    onDone({
      ...account,
      firstName: String(form.get('given_name') ?? '').trim(),
      lastName: String(form.get('family_name') ?? '').trim(),
      email: String(form.get('email') ?? '').trim(),
    });
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-[18px]">
      <ObiLogo className="block h-[40px] w-auto self-start text-[#002766]" />
      <Heading title="Create your account">
        Build, simulate and analyse brain models in your browser, and learn as you go.
      </Heading>
      <GoogleButton onClick={onGoogle} />
      <div className="grid grid-cols-2 gap-[12px]">
        <label className={LABEL}>
          First name
          <input ref={first} name="given_name" required defaultValue={account.firstName} className={FIELD} />
        </label>
        <label className={LABEL}>
          Last name
          <input name="family_name" defaultValue={account.lastName} className={FIELD} />
        </label>
      </div>
      <label className={LABEL}>
        Email
        <input
          name="email"
          type="email"
          required
          defaultValue={account.email}
          placeholder="you@institute.org"
          className={FIELD}
        />
      </label>
      <label className={LABEL}>
        <span>
          Institution <span className="font-normal text-neutral-400">(optional)</span>
        </span>
        <input name="organization" className={FIELD} />
      </label>
      <button type="submit" className={PRIMARY}>
        Continue
      </button>
      <p className="text-center text-[13px] leading-[18px] text-neutral-500">
        Already have an account?{' '}
        <button type="button" onClick={onLogin} className="text-primary-9 font-semibold hover:underline">
          Log in
        </button>
      </p>
      <p className={cn(NOTE, 'text-center')}>A prototype: nothing is sent, and no account is made.</p>
    </form>
  );
}

function Login({
  email,
  onGoogle,
  onSignUp,
  onDone,
}: {
  email: string;
  onGoogle: () => void;
  onSignUp: () => void;
  onDone: (email: string) => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onDone(String(new FormData(e.currentTarget).get('email') ?? '').trim());
      }}
      className="flex flex-col gap-[18px]"
    >
      <ObiLogo className="block h-[40px] w-auto self-start text-[#002766]" />
      <Heading title="Welcome back">Log in to your Virtual Lab.</Heading>
      <GoogleButton onClick={onGoogle} />
      <label className={LABEL}>
        Email
        <input
          name="email"
          type="email"
          required
          autoFocus
          defaultValue={email || readDummyAccount()?.email}
          placeholder="you@institute.org"
          className={FIELD}
        />
      </label>
      <button type="submit" className={PRIMARY}>
        Email me a code
      </button>
      <p className="text-center text-[13px] leading-[18px] text-neutral-500">
        New here?{' '}
        <button type="button" onClick={onSignUp} className="text-primary-9 font-semibold hover:underline">
          Create an account
        </button>
      </p>
    </form>
  );
}

/** A dummy of Google's account chooser, offering test accounts. */
function GoogleChooser({
  onChoose,
  onOther,
}: {
  onChoose: (account: (typeof TEST_ACCOUNTS)[number]) => void;
  onOther: () => void;
}) {
  return (
    <div className="flex flex-col gap-[16px] rounded-[16px] border border-neutral-200 p-[24px] shadow-[0_12px_40px_rgba(0,39,102,0.08)]">
      <div className="flex items-center gap-[10px]">
        <span className="flex size-[26px] items-center justify-center rounded-full bg-neutral-100 text-[13px] font-bold text-neutral-600">
          G
        </span>
        <span className="text-[13px] font-semibold text-neutral-600">Sign in with Google</span>
        <span className="ml-auto rounded-full bg-amber-100 px-[8px] py-[2px] text-[10px] font-semibold tracking-[0.08em] text-amber-700 uppercase">
          Test accounts
        </span>
      </div>
      <Heading title="Choose an account">to continue to the Open Brain Platform</Heading>
      <ul className="flex flex-col">
        {TEST_ACCOUNTS.map((test) => (
          <li key={test.email} className="border-t border-neutral-100">
            <button
              type="button"
              onClick={() => onChoose(test)}
              className="flex w-full items-center gap-[12px] rounded-[10px] px-[8px] py-[12px] text-left transition-colors hover:bg-neutral-50"
            >
              <Initials first={test.firstName} last={test.lastName} />
              <span className="flex flex-col">
                <span className="text-primary-9 text-[14px] font-semibold">
                  {test.firstName} {test.lastName}
                </span>
                <span className="text-[13px] text-neutral-500">{test.email}</span>
              </span>
            </button>
          </li>
        ))}
        <li className="border-t border-neutral-100">
          <button
            type="button"
            onClick={onOther}
            className="text-primary-9 flex w-full items-center gap-[12px] rounded-[10px] px-[8px] py-[12px] text-left text-[14px] font-semibold transition-colors hover:bg-neutral-50"
          >
            <span className="flex size-[36px] items-center justify-center rounded-full border border-dashed border-neutral-300 text-[18px] text-neutral-400">
              +
            </span>
            Use your email instead
          </button>
        </li>
      </ul>
      <p className={NOTE}>No Google sign-in happens: these are test accounts for trying the flow.</p>
    </div>
  );
}

export function Initials({ first, last, size = 36 }: { first: string; last: string; size?: number }) {
  return (
    <span
      className="bg-primary-9 flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {(first[0] ?? '?').toUpperCase()}
      {(last[0] ?? '').toUpperCase()}
    </span>
  );
}

/** A moment's work, with something turning. */
function Working({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-[18px] py-[60px]">
      <span className="border-primary-9 size-[38px] animate-spin rounded-full border-[3px] border-t-transparent" />
      <p className="text-primary-9 text-[16px] font-semibold">{text}</p>
    </div>
  );
}

/** Six digits, any six, typed or pasted, a box each. */
function Verify({ email, onDone }: { email: string; onDone: () => void }) {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [checking, setChecking] = useState(false);
  const [resent, setResent] = useState(false);
  const boxes = useRef<Array<HTMLInputElement | null>>([]);
  useEffect(() => boxes.current[0]?.focus(), []);
  const full = digits.every((d) => d !== '');
  const set = (i: number, value: string) => {
    const typed = value.replace(/\D/g, '');
    if (typed.length > 1) {
      // Pasted: as many boxes as it fills.
      const next = [...digits];
      for (let k = 0; k < typed.length && i + k < 6; k++) next[i + k] = typed[k];
      setDigits(next);
      boxes.current[Math.min(5, i + typed.length)]?.focus();
      return;
    }
    const next = [...digits];
    next[i] = typed;
    setDigits(next);
    if (typed && i < 5) boxes.current[i + 1]?.focus();
  };
  const check = () => {
    setChecking(true);
    setTimeout(onDone, 800);
  };
  if (checking) return <Working text="Checking your code…" />;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (full) check();
      }}
      className="flex flex-col gap-[18px]"
    >
      <Heading title="Check your email">
        We sent a 6-digit code to <span className="text-primary-9 font-semibold">{email || 'your email'}</span>.
      </Heading>
      <div className="flex justify-between gap-[10px]">
        {digits.map((digit, i) => (
          <input
            // biome-ignore lint/suspicious/noArrayIndexKey: the boxes are fixed, six in order
            key={i}
            ref={(box) => {
              boxes.current[i] = box;
            }}
            value={digit}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={`Digit ${i + 1}`}
            onChange={(e) => set(i, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !digit && i > 0) boxes.current[i - 1]?.focus();
            }}
            className="text-primary-9 focus:border-primary-9 h-[58px] w-full rounded-[12px] border border-neutral-300 text-center text-[24px] font-semibold outline-none"
          />
        ))}
      </div>
      <button type="submit" disabled={!full} className={PRIMARY}>
        Verify
      </button>
      <div className="flex items-center justify-between text-[13px] text-neutral-500">
        <button
          type="button"
          onClick={() => setResent(true)}
          className="text-primary-9 font-semibold hover:underline"
        >
          {resent ? 'Sent again' : 'Resend the code'}
        </button>
        <button
          type="button"
          onClick={() => setDigits(['4', '2', '0', '7', '1', '9'])}
          className="text-neutral-400 hover:text-neutral-600"
        >
          Fill in a test code
        </button>
      </div>
      <p className={NOTE}>A prototype: no email is sent, and any six digits work.</p>
    </form>
  );
}

/** The lab being made: a line at a time, ticked off. */
function Creating({ onDone }: { onDone: () => void }) {
  const [done, setDone] = useState(0);
  const finished = useRef(onDone);
  useEffect(() => {
    finished.current = onDone;
  });
  useEffect(() => {
    if (done >= SETUP.length) {
      const timer = setTimeout(() => finished.current(), 500);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setDone((n) => n + 1), 700);
    return () => clearTimeout(timer);
  }, [done]);
  return (
    <div className="flex flex-col gap-[22px] py-[20px]">
      <Heading title="Setting things up" />
      <ul className="flex flex-col gap-[14px]">
        {SETUP.map((line, i) => (
          <li key={line} className="flex items-center gap-[12px] text-[15px]">
            {i < done ? (
              <span className={cn(styles.tick, 'bg-green-main flex size-[24px] items-center justify-center rounded-full text-white')}>
                <RiCheckLine className="size-[15px]" />
              </span>
            ) : i === done ? (
              <span className="border-primary-9 size-[24px] animate-spin rounded-full border-[2.5px] border-t-transparent" />
            ) : (
              <span className="size-[24px] rounded-full border-[2px] border-neutral-200" />
            )}
            <span className={i <= done ? 'text-primary-9 font-semibold' : 'text-neutral-400'}>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const SPARK_COLOURS = ['#1677ff', '#08979c', '#d6336c', '#fa8c16', '#002766'];

function Welcome({
  account,
  back,
  onEnter,
  onLearn,
}: {
  account: IDummyAccount;
  back: boolean;
  onEnter: () => void;
  onLearn: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-[20px] text-center">
      <div className="relative flex h-[120px] w-full items-end justify-center">
        {Array.from({ length: 14 }, (_, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: decoration, fixed
            key={i}
            className={styles.spark}
            style={{
              left: `${8 + ((i * 37) % 84)}%`,
              background: SPARK_COLOURS[i % SPARK_COLOURS.length],
              animationDelay: `${(i * 0.17) % 2.4}s`,
            }}
          />
        ))}
        <Initials first={account.firstName} last={account.lastName} size={72} />
      </div>
      <Heading title={`${back ? 'Welcome back' : 'Welcome'}, ${account.firstName || 'researcher'}!`}>
        {back
          ? 'Your Virtual Lab is as you left it.'
          : 'Your Virtual Lab is ready, with your first project and 100 free credits.'}
      </Heading>
      <dl className="grid w-full grid-cols-3 gap-[10px] rounded-[14px] border border-neutral-200 p-[14px] text-left">
        {[
          ['Lab', account.labName || 'Your Lab'],
          ['Project', account.projectName || 'My first project'],
          ['Credits', '100'],
        ].map(([term, value]) => (
          <div key={term} className="flex min-w-0 flex-col gap-[2px]">
            <dt className="text-[11px] font-semibold tracking-[0.12em] text-neutral-400 uppercase">{term}</dt>
            <dd className="text-primary-9 truncate text-[14px] font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex w-full flex-col gap-[10px]">
        <button type="button" onClick={onEnter} className={NAVY}>
          Enter the platform
        </button>
        <button type="button" onClick={onLearn} className={OUTLINED}>
          Take the course
        </button>
      </div>
      <p className={NOTE}>A prototype: the lab and the account are only kept in this browser.</p>
    </div>
  );
}
