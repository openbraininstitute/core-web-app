type Props = { sessionId: string };

export function SynapticInput({ sessionId }: Props) {
  return (
    <div className="secondary-scrollbar mb-4 flex h-full w-full flex-col gap-4 overflow-x-hidden overflow-y-auto px-5 select-none">
      {sessionId}
    </div>
  );
}
