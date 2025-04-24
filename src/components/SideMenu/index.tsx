'use client';

import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import {
  DownOutlined,
  HomeOutlined,
  QuestionCircleOutlined,
  UpOutlined,
  UserOutlined,
} from '@ant-design/icons';
import Link from 'next/link';

import HelpMenu from '@/components/HelpMenu';
import UserMenu from '@/components/user-menu';
import { LabItem, LinkItem, ProjectItem } from '@/components/VerticalLinks';
import { virtualLabDetailAtomFamily } from '@/state/virtual-lab/lab';
import { virtualLabProjectDetailsAtomFamily } from '@/state/virtual-lab/projects';
import { classNames } from '@/util/utils';
import { useUnwrappedValue } from '@/hooks/hooks';

type SideMenuProps = {
  lab: LabItem;
  links: LinkItem[];
  project?: ProjectItem;
};

function ProjectLink({ project, lab }: { project: ProjectItem; lab: LabItem }) {
  // Unwrap prevents flashing due to triggering global Suspense
  const projectInfo = useUnwrappedValue(
    virtualLabProjectDetailsAtomFamily({
      virtualLabId: lab.id,
      projectId: project.id,
    })
  );

  return (
    projectInfo && (
      <div className="flex w-full flex-col items-center justify-center overflow-hidden">
        <Link
          key={lab.id}
          href={project.href}
          className="overflow-hidden text-center font-semibold text-ellipsis whitespace-nowrap capitalize hover:text-white"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
          }}
        >
          {projectInfo && <DownOutlined className="text-primary-3 my-3" />}
          <span className="px-2">{projectInfo?.name}</span>
        </Link>
      </div>
    )
  );
}

export default function SideMenu({ lab, project, links }: SideMenuProps) {
  const result = useAtomValue(unwrap(virtualLabDetailAtomFamily(lab.id)));
  return (
    <div
      className={classNames(
        'border-primary-7 bg-primary-9 text-light sticky top-0 flex h-screen w-[45px]',
        'flex-col items-center justify-center gap-2 border-r-[1px] transition-transform ease-in-out will-change-auto'
      )}
    >
      <div className="flex w-[45px] grow flex-col items-center justify-between overflow-hidden">
        <div className="mt-4 flex w-full flex-col items-center gap-2 overflow-hidden">
          {links
            .slice()
            .reverse()
            .map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className={classNames(
                  'text-primary-5 flex items-center justify-center hover:text-white',
                  link.styles
                )}
                style={{
                  writingMode: 'sideways-lr',
                }}
              >
                <div className="origin-center rounded-3xl px-2 py-1 font-semibold whitespace-nowrap capitalize">
                  <span className="text-base">{link.content}</span>
                </div>
              </Link>
            ))}
          {links.length > 0 && <UpOutlined className="text-primary-3" />}
          {project && <ProjectLink project={project} lab={lab} />}
          {!!result && (
            <div className="text-primary-3 mt-2 flex w-full flex-col items-center gap-2 overflow-hidden">
              <Link
                key={`${lab.href}/${lab.id}`}
                href={lab.href}
                className="overflow-hidden text-center text-ellipsis whitespace-nowrap capitalize"
                style={{
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                }}
              >
                <span>
                  Virtual lab:
                  <span className="mt-3 inline-block text-white">{result?.virtual_lab.name}</span>
                </span>
              </Link>
            </div>
          )}
        </div>

        <div className="text-primary-3 mb-5 flex w-full flex-col items-center gap-2 overflow-hidden">
          <HelpMenu>
            <QuestionCircleOutlined className="group-hover:text-white" />
          </HelpMenu>
          <UserMenu>
            <UserOutlined className="group-hover:text-white" />
          </UserMenu>
          <Link href="/app/virtual-lab" className="group text-primary-2 cursor-pointer">
            <HomeOutlined className="group-hover:text-white" />
          </Link>
        </div>
      </div>
    </div>
  );
}
