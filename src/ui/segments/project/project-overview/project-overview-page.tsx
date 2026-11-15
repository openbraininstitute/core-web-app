'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { listProjectMembers } from '@/api/virtual-lab-svc/queries/member';
import { getProject } from '@/api/virtual-lab-svc/queries/project';
import { getProjectJobReports } from '@/services/virtual-lab/projects';
import { categoryRenderFn, typeRenderFn } from '@/ui/segments/project/credits/job-report-list';
import { config } from '@/config';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { keyBuilder } from '@/ui/use-query-keys/workspace';
import { cn } from '@/utils/css-class';

/**
 * The project's own page, after the Figma "OBI Project Home (prototype branch)" (AI-Trial 253:1322): the project
 * on a blue card with its members, its discussion under it, and its credits and activity beside them. The name and
 * description are the project's, and so is the activity (its job reports, as the credits page lists them); the
 * members, messages and credits are the design's placeholders. The
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
      // on a phone as tall as its words need, the picture behind them fainter
      className="relative h-[332px] shrink-0 overflow-hidden rounded-[14px] max-md:h-auto max-md:min-h-[260px]"
      // the design's fill: #0050b3 to a fifth of the way, then to #69c0ff, turned a little off the horizontal
      style={{ background: 'linear-gradient(95deg, #0050b3 0%, #0050b3 19%, #69c0ff 100%)' }}
    >
      {/* the design's picture, 430 of the card's 726 at its right, cropped to fill */}
      <img
        src="/images/thalamus-project-card.png"
        alt=""
        className="absolute top-0 right-0 h-full w-[59.2%] object-cover max-md:w-full max-md:opacity-45"
        draggable={false}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(90deg, rgb(0 80 179 / 0.98) 0%, rgb(0 80 179 / 0.62) 55%, rgb(0 80 179 / 0.06) 100%)',
        }}
      />
      <div className="relative flex h-full flex-col justify-between gap-[20px] p-[24px] max-md:min-h-[260px] max-md:p-[18px]">
        <div className="flex max-w-[430px] flex-col gap-[10px]">
          <h2 className="text-[28px] leading-[34px] font-bold text-white max-md:text-[22px] max-md:leading-[27px]">
            {name}
          </h2>
          <p className="text-[14px] leading-[22px] text-[#dbe4f0] max-md:text-[13px] max-md:leading-[19px]">{about}</p>
        </div>
        <div className="flex items-center justify-between gap-[10px] max-md:flex-wrap">
          <div className="flex items-center gap-[10px] max-md:gap-[6px]">
            {MEMBERS.map((m) => (
              <span
                key={m.initials}
                className="flex size-[40px] items-center justify-center rounded-full text-[14px] font-bold max-md:size-[34px] max-md:text-[12px]"
                style={{ background: m.fill, color: m.ink }}
              >
                {m.initials}
              </span>
            ))}
            <button
              type="button"
              aria-label="Invite a member"
              className="relative flex size-[40px] items-center justify-center rounded-full text-[18px] leading-none text-white transition-colors hover:bg-white/10 max-md:size-[34px]"
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
    // on a phone a box of its own height in the page's scroll
    <section className="flex min-h-0 flex-1 flex-col rounded-[12px] border border-[#f0f0f0] bg-white p-[16px] max-md:flex-none">
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
    <section className="flex h-[92px] shrink-0 items-center justify-between rounded-[12px] border border-[#f0f0f0] bg-[#f5f5f5] px-[24px] max-md:h-auto max-md:flex-col max-md:items-stretch max-md:gap-[14px] max-md:px-[16px] max-md:py-[14px]">
      <div className="flex gap-[40px] max-md:justify-between max-md:gap-[16px]" style={{ color: NAVY }}>
        <div className="flex flex-col">
          <span className="text-[13px] font-light">Virtual lab credits</span>
          <span className="text-[21px] leading-[29px] font-bold">12,480</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[13px] font-light">Project credits</span>
          <span className="text-[21px] leading-[29px] font-bold">650</span>
        </div>
      </div>
      <div className="flex gap-[8px] max-md:[&>a]:flex-1 max-md:[&>a]:justify-center">
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

/** How many of the project's activities a page of the table shows. */
const ACTIVITY_PAGE_SIZE = 8;

/** A report's date as the design writes them, "24 Jul 2026". */
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Credits to two places at most, without trailing zeros. */
const credits = (amount: string) => {
  const n = parseFloat(amount);
  return Number.isNaN(n) ? amount : String(Number(n.toFixed(2)));
};

/**
 * The project's activity: what its members ran and what each cost, the credits page's job reports (the user asked
 * for the real table, as the old home's credits page shows it), in the design's table, a page at a time.
 */
function Activity() {
  const { virtualLabId, projectId } = useWorkspace();
  const [page, setPage] = useState(1);
  const { data: reports, isLoading } = useQuery({
    queryKey: keyBuilder.credits({ virtualLabId, projectId, page, pageSize: ACTIVITY_PAGE_SIZE }),
    queryFn: () => getProjectJobReports({ virtualLabId, projectId, page, pageSize: ACTIVITY_PAGE_SIZE }),
    enabled: Boolean(virtualLabId && projectId),
    placeholderData: (previous) => previous,
  });
  const { data: members } = useQuery({
    queryKey: keyBuilder.listProjectTeam({ virtualLabId, projectId }),
    queryFn: () => listProjectMembers({ virtualLabId, projectId }),
    enabled: Boolean(virtualLabId && projectId),
  });
  const nameOf = (userId: string) => {
    const user = members?.data?.users?.find((u) => u.id === userId);
    return user ? `${user.first_name} ${user.last_name}` : '—';
  };
  const items = reports?.data.items ?? [];
  const total = reports?.data.meta.total_items ?? 0;
  const pages = Math.max(1, Math.ceil(total / ACTIVITY_PAGE_SIZE));
  const rows = items.map((r) => ({
    key: r.job_id,
    cells: [
      categoryRenderFn(r.subtype),
      typeRenderFn(r.subtype),
      nameOf(r.user_id),
      shortDate(r.started_at),
      credits(r.amount),
    ],
  }));
  // up to five pages about the one open
  const first = Math.max(1, Math.min(page - 2, pages - 4));
  const shownPages = Array.from({ length: Math.min(5, pages) }, (_, i) => first + i);
  const empty = !isLoading && rows.length === 0;
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[12px] border border-[#f0f0f0] max-md:flex-none">
      {/* on a phone, each row a short card: what and where, who and when, its credits */}
      <h3 className="px-[16px] pt-[14px] pb-[6px] text-[14px] font-bold md:hidden" style={{ color: NAVY }}>
        Activity
      </h3>
      <div className="flex flex-col md:hidden">
        {rows.map(({ key, cells: [activity, scale, user, date, cost] }) => (
          <div
            key={key}
            className="flex items-center justify-between gap-[12px] border-b border-[#f0f0f0] px-[16px] py-[10px]"
            style={{ color: NAVY }}
          >
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-[13px] font-semibold">
                {activity} · {scale}
              </span>
              <span className="text-[11.5px] text-[#8c8c8c]">
                {user} · {date}
              </span>
            </span>
            <span className="shrink-0 text-[13px] font-semibold">{cost}</span>
          </div>
        ))}
      </div>
      <div className="flex h-[41px] shrink-0 items-center bg-[#f5f5f5] px-[16px] max-md:hidden">
        {COLUMNS.map((c) => (
          <span key={c.title} className="text-[12px] font-light" style={{ width: c.w, color: NAVY }}>
            {c.title}
          </span>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto max-md:hidden">
        {isLoading &&
          Array.from({ length: 5 }, (_, i) => (
            // eslint-disable-next-line react/no-array-index-key -- placeholder rows
            <div key={i} className="flex h-[40px] items-center border-b border-[#f0f0f0] px-[16px]">
              <span className="h-[10px] w-3/4 animate-pulse rounded-full bg-[#f0f0f0]" />
            </div>
          ))}
        {empty && <p className="px-[16px] py-[18px] text-[12.5px] text-[#8c8c8c]">No activity in this project yet.</p>}
        {rows.map(({ key, cells }) => (
          <div
            key={key}
            className="flex h-[40px] items-center border-b border-[#f0f0f0] px-[16px] text-[12.5px]"
            style={{ color: NAVY }}
          >
            {cells.map((cell, i) => (
              <span
                key={COLUMNS[i].title}
                title={cell}
                className="truncate pr-[8px]"
                style={{ width: COLUMNS[i].w, flexShrink: i === 1 ? 1 : 0, minWidth: 0 }}
              >
                {cell}
              </span>
            ))}
          </div>
        ))}
      </div>
      {pages > 1 && (
        <div className="flex h-[52px] shrink-0 items-center justify-center gap-[6px]">
          {(['‹', ...shownPages, '›'] as const).map((p) => {
            const to = p === '‹' ? page - 1 : p === '›' ? page + 1 : p;
            const on = p === page;
            const off = to < 1 || to > pages;
            return (
              <button
                key={String(p)}
                type="button"
                disabled={off}
                onClick={() => setPage(to)}
                aria-current={on ? 'page' : undefined}
                className={cn(
                  'flex size-[28px] items-center justify-center rounded-full text-[12px] disabled:opacity-40',
                  on ? 'text-white' : 'border border-[#d9d9d9] text-[#595959] hover:border-[#002766]'
                )}
                style={on ? { background: NAVY } : undefined}
              >
                {p}
              </button>
            );
          })}
        </div>
      )}
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
    // on a phone one column down the page, which scrolls: the card, the credits, the activity, the discussion
    <div className="flex h-full min-h-[760px] w-full flex-col gap-[14px] bg-white px-[18px] pt-[16px] pb-[18px] max-md:h-auto max-md:min-h-0 max-md:gap-[12px] max-md:px-[12px] max-md:pt-[12px]">
      <h1 className="shrink-0 text-[20px] leading-[28px] max-md:text-[17px] max-md:leading-[23px]" style={{ color: NAVY }}>
        <span className="font-bold">Project Home:</span> {name}
      </h1>
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-[24px] max-md:flex max-md:flex-col max-md:gap-[12px]">
        <div className="flex min-h-0 flex-col gap-[16px] max-md:contents">
          <ProjectCard name={name} about={about} />
          {/* on a phone after the activity (the user asked) */}
          <div className="max-md:order-4 md:contents">
            <Discussion />
          </div>
        </div>
        <div className="flex min-h-0 flex-col gap-[16px] max-md:contents">
          <div className="max-md:order-2 md:contents">
            <Balance base={base} />
          </div>
          <div className="max-md:order-3 md:contents">
            <Activity />
          </div>
        </div>
      </div>
    </div>
  );
}
