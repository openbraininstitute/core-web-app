'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { config } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

/**
 * The project's own page, after the Figma "OBI Project Home (prototype branch)" (AI-Trial 253:1322): the project
 * on a blue card with its members, its discussion under it, and its credits and activity beside them. The name and
 * description are the project's; the members, messages, credits and activity are the design's placeholders. The
 * card's picture is the design's own (public/images/thalamus-project-card.png, its black transparent).
 */

const NAVY = '#002766';
const PLACEHOLDER_ABOUT =
  'A biophysically-detailed reconstruction of thalamocortical circuitry, built from MICrONS EM data and fitted e-models. Used for burst-mode simulation studies.';

const MEMBERS = [
  { initials: 'JI', fill: '#339f00', ink: '#fff' },
  { initials: 'ER', fill: '#f5b555', ink: NAVY },
  { initials: 'MC', fill: '#f05c2d', ink: '#fff' },
  { initials: 'PA', fill: '#58ffe1', ink: NAVY },
  { initials: 'LK', fill: '#ff2a83', ink: '#fff' },
];

const MESSAGES = [
  {
    who: 'Elena Rossi',
    initials: 'ER',
    fill: '#339f00',
    when: '2d ago',
    text: 'Pushed the latest ion channel build — results look promising. Can someone review the parameter sweep?',
  },
  {
    who: 'Marcus Chen',
    initials: 'MC',
    fill: '#f05c2d',
    when: '1d ago',
    text: 'Looks good to me. The conductance values align with the paper. I will kick off a circuit simulation tomorrow.',
  },
  {
    who: 'Priya Ananth',
    initials: 'PA',
    fill: '#ff2a83',
    when: '4h ago',
    text: 'Uploaded a new morphology dataset to the project. Let me know if you need the metadata exported.',
  },
];

const ACTIVITY: Array<[string, string, string, string, number]> = [
  ['Simulate', 'Small: Microcircuit (3–20 neurons)', 'James Isbister', '24 Jul 2026', 412],
  ['Build', 'Single cell', 'James Isbister', '24 Jul 2026', 118],
  ['Simulate', 'Single: Single neuron + extrinsic', 'Marcus Chen', '23 Jul 2026', 96],
  ['Build', 'Ion channel', 'Elena Rossi', '23 Jul 2026', 254],
  ['Notebook', 'Notebook', 'Priya Ananth', '22 Jul 2026', 12],
  ['Build', 'Neuron morphology', 'Marcus Chen', '21 Jul 2026', 76],
  ['Storage', 'Storage', '—', '21 Jul 2026', 8],
  ['Simulate', 'Synaptome', 'Elena Rossi', '20 Jul 2026', 143],
];
/** The activity table's columns, as wide as the design's. */
const COLUMNS = [
  { title: 'Activity', w: 110 },
  { title: 'Scale', w: 210 },
  { title: 'User', w: 130 },
  { title: 'Date', w: 130 },
  { title: 'Credits', w: 80 },
];

function ProjectCard({ name, about }: { name: string; about: string }) {
  return (
    <section
      className="relative h-[332px] shrink-0 overflow-hidden rounded-[14px]"
      // the design's fill: #0050b3 to a fifth of the way, then to #69c0ff, turned a little off the horizontal
      style={{ background: 'linear-gradient(95deg, #0050b3 0%, #0050b3 19%, #69c0ff 100%)' }}
    >
      {/* the design's picture, 430 of the card's 726 at its right, cropped to fill */}
      <img
        src="/images/thalamus-project-card.png"
        alt=""
        className="absolute top-0 right-0 h-full w-[59.2%] object-cover"
        draggable={false}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgb(0 80 179 / 0.98) 0%, rgb(0 80 179 / 0.62) 55%, rgb(0 80 179 / 0.06) 100%)',
        }}
      />
      <div className="relative flex h-full flex-col justify-between p-[24px]">
        <div className="flex max-w-[430px] flex-col gap-[10px]">
          <h2 className="text-[28px] leading-[34px] font-bold text-white">{name}</h2>
          <p className="text-[14px] leading-[22px] text-[#dbe4f0]">{about}</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-[10px]">
            {MEMBERS.map((m) => (
              <span
                key={m.initials}
                className="flex size-[40px] items-center justify-center rounded-full text-[14px] font-bold"
                style={{ background: m.fill, color: m.ink }}
              >
                {m.initials}
              </span>
            ))}
            <button
              type="button"
              aria-label="Invite a member"
              className="relative flex size-[40px] items-center justify-center rounded-full text-[18px] leading-none text-white transition-colors hover:bg-white/10"
            >
              {/* the design's ring: 1.4 px inside, dashed 4 on 4 */}
              <svg className="absolute inset-0 size-full" viewBox="0 0 40 40" aria-hidden>
                <circle cx="20" cy="20" r="19.3" fill="none" stroke="#fff" strokeWidth="1.4" strokeDasharray="4 4" />
              </svg>
              +
            </button>
          </div>
          <span className="text-[12px] text-[#b6c4da]">5 members · 2 admins</span>
        </div>
      </div>
    </section>
  );
}

function Discussion() {
  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-[12px] border border-[#f0f0f0] bg-white p-[16px]">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] leading-[20px] font-bold" style={{ color: NAVY }}>
          Discussion
        </h3>
        <span className="text-[11.5px] text-[#8c8c8c]">{MESSAGES.length} messages</span>
      </div>
      <div className="mt-[12px] flex min-h-0 flex-1 flex-col gap-[12px] overflow-y-auto">
        {MESSAGES.map((m) => (
          <div key={m.who} className="flex items-end gap-[8px]">
            <span
              className="flex size-[28px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style={{ background: m.fill }}
            >
              {m.initials}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
              <div className="flex items-baseline gap-[8px] px-[4px]">
                <span className="text-[11.5px] font-semibold" style={{ color: NAVY }}>
                  {m.who}
                </span>
                <span className="text-[10px] text-[#8c8c8c]">{m.when}</span>
              </div>
              <p
                className="rounded-[10px] rounded-bl-[2px] border border-[#f0f0f0] bg-[#fafafa] px-[12px] py-[8px] text-[11.5px] leading-[17px]"
                style={{ color: NAVY }}
              >
                {m.text}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-[12px] flex h-[40px] items-center rounded-[8px] border border-[#f0f0f0] bg-[#fafafa] pr-[8px] pl-[12px]">
        <input
          placeholder="Write a message…"
          className="min-w-0 flex-1 bg-transparent text-[11.5px] outline-none placeholder:text-[#8c8c8c]"
          style={{ color: NAVY }}
        />
        <button
          type="button"
          aria-label="Send"
          className="flex size-[24px] items-center justify-center rounded-[6px] text-[10px] font-semibold text-white"
          style={{ background: 'rgb(0 39 102 / 0.4)' }}
        >
          ➤
        </button>
      </div>
    </section>
  );
}

function Balance({ base }: { base: string }) {
  const pill =
    'flex h-[38px] items-center gap-[8px] rounded-full px-[16px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90';
  return (
    <section className="flex h-[92px] shrink-0 items-center justify-between rounded-[12px] border border-[#f0f0f0] bg-[#f5f5f5] px-[24px]">
      <div className="flex gap-[40px]" style={{ color: NAVY }}>
        <div className="flex flex-col">
          <span className="text-[13px] font-light">Virtual lab credits</span>
          <span className="text-[21px] leading-[29px] font-bold">12,480</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[13px] font-light">Project credits</span>
          <span className="text-[21px] leading-[29px] font-bold">650</span>
        </div>
      </div>
      <div className="flex gap-[8px]">
        <Link href={`${base}/credits`} className={pill} style={{ background: NAVY }}>
          Transfer credits <span aria-hidden>⇄</span>
        </Link>
        <Link href={`${base}/credits`} className={pill} style={{ background: NAVY }}>
          Buy credits <span aria-hidden>+</span>
        </Link>
      </div>
    </section>
  );
}

function Activity() {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-[#f0f0f0]">
      <div className="flex h-[41px] shrink-0 items-center bg-[#f5f5f5] px-[16px]">
        {COLUMNS.map((c) => (
          <span key={c.title} className="text-[12px] font-light" style={{ width: c.w, color: NAVY }}>
            {c.title}
          </span>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {ACTIVITY.map((row) => (
          <div
            key={row.join()}
            className="flex h-[40px] items-center border-b border-[#f0f0f0] px-[16px] text-[12.5px]"
            style={{ color: NAVY }}
          >
            {row.map((cell, i) => (
              <span key={COLUMNS[i].title} className="truncate" style={{ width: COLUMNS[i].w }}>
                {cell}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className="flex h-[52px] shrink-0 items-center justify-center gap-[6px]">
        {['‹', '1', '2', '3', '›'].map((p) => (
          <button
            key={p}
            type="button"
            className={cn(
              'flex size-[28px] items-center justify-center rounded-full text-[12px]',
              p === '1' ? 'text-white' : 'border border-[#d9d9d9] text-[#595959] hover:border-[#002766]'
            )}
            style={p === '1' ? { background: NAVY } : undefined}
          >
            {p}
          </button>
        ))}
      </div>
    </section>
  );
}

export function ProjectOverviewPage() {
  const { virtualLabId, projectId } = useWorkspace();
  const base = `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}`;
  const { data: project } = useQuery({
    queryKey: keyBuilder.getWorkspace({ virtualLabId, projectId }),
    queryFn: () => getProject({ virtualLabId, projectId }),
    enabled: Boolean(virtualLabId && projectId),
  });
  const name = project?.name ?? 'Project';
  const about = project?.description?.trim() || PLACEHOLDER_ABOUT;

  return (
    <div className="flex h-full min-h-[760px] w-full flex-col gap-[14px] bg-white px-[18px] pt-[16px] pb-[18px]">
      <h1 className="shrink-0 text-[20px] leading-[28px]" style={{ color: NAVY }}>
        <span className="font-bold">Project Home:</span> {name}
      </h1>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-[24px]">
        <div className="flex min-h-0 flex-col gap-[16px]">
          <ProjectCard name={name} about={about} />
          <Discussion />
        </div>
        <div className="flex min-h-0 flex-col gap-[16px]">
          <Balance base={base} />
          <Activity />
        </div>
      </div>
    </div>
  );
}
