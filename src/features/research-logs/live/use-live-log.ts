'use client';

import { HocuspocusProvider } from '@hocuspocus/provider';
import { getSession, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import * as Y from 'yjs';

import { useWorkspace } from '@/ui/hooks/use-workspace';

/** Where the co-editing server listens; unset, logs are edited the old way. */
export const COLLAB_URL = process.env.NEXT_PUBLIC_RESEARCH_LOG_COLLAB_URL;

const COLOURS = ['#2563eb', '#16a34a', '#db2777', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04'];

export type Peer = {
  clientId: number;
  name: string;
  color: string;
  editing: boolean;
  canWrite: boolean;
  /** An agent writing through the server's edit API, not a person in a browser. */
  agent: boolean;
  self: boolean;
};

export type LiveLog = {
  doc: Y.Doc;
  text: Y.Text;
  meta: Y.Map<unknown>;
  provider: HocuspocusProvider;
  /** Synced with the server at least once, so the shared text is the log's. */
  ready: boolean;
  connected: boolean;
  readOnly: boolean;
  peers: Peer[];
  self: Peer | undefined;
  setEditing: (editing: boolean) => void;
};

type Connection = { doc: Y.Doc; provider: HocuspocusProvider };

/** Joins the log's shared document: its text, who else is in it, and whether one may type. */
export function useLiveLog(logId: string): LiveLog | null {
  const { virtualLabId, projectId } = useWorkspace();
  const { data: session } = useSession();
  const name = session?.user?.name ?? session?.user?.email ?? 'Someone';
  const [conn, setConn] = useState<Connection | null>(null);
  const [ready, setReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [readOnly, setReadOnly] = useState(true);
  const [peers, setPeers] = useState<Peer[]>([]);

  useEffect(() => {
    if (!COLLAB_URL) return;
    const url = new URL(COLLAB_URL);
    if (virtualLabId && projectId) {
      url.searchParams.set('virtualLabId', virtualLabId);
      url.searchParams.set('projectId', projectId);
    }
    const doc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: url.toString(),
      name: `research-log:${logId}`,
      document: doc,
      token: async () => (await getSession())?.accessToken ?? '',
      onSynced: ({ state }) => state && setReady(true),
      onStatus: ({ status }) => setConnected(status === 'connected'),
      onAuthenticated: ({ scope }) => setReadOnly(scope === 'readonly'),
    });
    setConn({ doc, provider });
    return () => {
      provider.destroy();
      doc.destroy();
      setConn(null);
      setReady(false);
      setConnected(false);
    };
  }, [logId, virtualLabId, projectId]);

  // what the others see of this tab: a name, a colour for the cursor, and whether it types
  useEffect(() => {
    const awareness = conn?.provider.awareness;
    if (!awareness) return;
    const color = COLOURS[awareness.clientID % COLOURS.length];
    awareness.setLocalStateField('user', { name, color, colorLight: `${color}33` });
    awareness.setLocalStateField('canWrite', !readOnly);
  }, [conn, name, readOnly]);

  useEffect(() => {
    const awareness = conn?.provider.awareness;
    if (!awareness) return;
    const read = () =>
      setPeers(
        [...awareness.getStates().entries()]
          .filter(([, s]) => s.user)
          .map(([clientId, s]) => ({
            clientId,
            name: s.user.name,
            color: s.user.color,
            editing: !!s.editing,
            canWrite: !!s.canWrite,
            agent: !!s.agent,
            self: clientId === awareness.clientID,
          }))
          .sort((a, b) => a.clientId - b.clientId)
      );
    read();
    awareness.on('change', read);
    return () => awareness.off('change', read);
  }, [conn]);

  if (!conn) return null;
  return {
    doc: conn.doc,
    text: conn.doc.getText('markdown'),
    meta: conn.doc.getMap('meta'),
    provider: conn.provider,
    ready,
    connected,
    readOnly,
    peers,
    self: peers.find((p) => p.self),
    setEditing: (editing) => conn.provider.awareness?.setLocalStateField('editing', editing),
  };
}

/** The shared text, re-read at most once a frame. */
export function useLiveText(text: Y.Text | undefined): string {
  const [value, setValue] = useState(() => text?.toString() ?? '');
  useEffect(() => {
    if (!text) return;
    let frame = 0;
    const read = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setValue(text.toString()));
    };
    setValue(text.toString());
    text.observe(read);
    return () => {
      cancelAnimationFrame(frame);
      text.unobserve(read);
    };
  }, [text]);
  return value;
}
