import { useQuery } from '@tanstack/react-query';
import { isNil, isNotNil } from 'es-toolkit';
import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';

import { accessToken, meOf, signIn } from '@/features/logbook/auth/session';
import { Board } from '@/features/logbook/board/Board';
import { navigate, pathOf, useRoute } from '@/features/logbook/router';

import type { ReactNode } from 'react';

function Centered({ children }: { readonly children: ReactNode }) {
  return (
    <main className="grid h-full place-items-center p-4">
      <section className="logbook-card flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        {children}
      </section>
    </main>
  );
}

export function LogbookRoot() {
  const session = useSession();
  const route = useRoute();
  const signedIn = session.status === 'authenticated';
  const pending = session.status === 'loading';
  // next-auth marks a failed token refresh on the session.
  const sessionError = session.data?.error ?? null;
  // Who this is, from the Keycloak access token.
  const me = useQuery({
    queryKey: ['me', session.data?.user?.email ?? null],
    enabled: signedIn,
    queryFn: async () => meOf(await accessToken()),
    staleTime: Number.POSITIVE_INFINITY,
  });

  // No session: go to Keycloak once and come back here.
  const redirected = useRef(false);
  useEffect(() => {
    if (pending || signedIn || isNotNil(sessionError) || redirected.current) return;
    redirected.current = true;
    void signIn();
  }, [pending, signedIn, sessionError]);

  // At /, use the person's first project.
  const fallback = me.data?.projects[0] ?? null;
  useEffect(() => {
    if (isNil(route.project) && isNotNil(fallback)) navigate(pathOf(fallback), true);
  }, [route.project, fallback]);

  const failure = sessionError ?? (me.isError ? me.error.message : null);
  if (isNotNil(failure))
    return (
      <Centered>
        <h1 className="text-[22px] font-bold">Sign-in failed</h1>
        <p className="max-w-[380px] text-[15px] leading-normal text-neutral-4">{failure}</p>
        <button type="button" className="btn-navy" onClick={() => void signIn()}>
          Try again
        </button>
      </Centered>
    );
  if (isNil(me.data))
    return (
      <Centered>
        <p className="max-w-[380px] text-[15px] leading-normal text-neutral-4">Signing in…</p>
      </Centered>
    );
  if (isNil(route.project))
    return (
      <Centered>
        <h1 className="text-[22px] font-bold">No project</h1>
        <p className="max-w-[380px] text-[15px] leading-normal text-neutral-4">
          You are not a member of any project yet. Ask a lab admin to add you to one.
        </p>
      </Centered>
    );
  return <Board me={me.data} project={route.project} logId={route.logId} pageId={route.pageId} />;
}
