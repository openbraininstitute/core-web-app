'use client';

import { ReactNode } from 'react';
import {
  DownOutlined,
  HomeOutlined,
  QuestionCircleOutlined,
  UpOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Tooltip } from 'antd';
import { useAtomValue } from 'jotai';
import { unwrap } from 'jotai/utils';
import Link from 'next/link';
import HelpMenu from '../HelpMenu';
import DocumentationIcon from '../icons/DocumentationIcon';

import UserMenu from '@/components/user-menu';
import { LabItem, LinkItem, ProjectItem } from '@/components/VerticalLinks';
import { useUnwrappedValue } from '@/hooks/hooks';
import { virtualLabDetailAtomFamily } from '@/state/virtual-lab/lab';
import { virtualLabProjectDetailsAtomFamily } from '@/state/virtual-lab/projects';
import { classNames } from '@/util/utils';

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
      <div
        className="flex w-full flex-col items-center justify-center overflow-hidden"
        title={projectInfo.name}
      >
        <Link
          key={lab.id}
          href={project.href}
          className="min-w-6! overflow-hidden text-center font-semibold text-ellipsis whitespace-nowrap !text-white capitalize hover:text-white"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
          }}
        >
          {projectInfo && <DownOutlined className="text-primary-3 mx-1" />}
          <span className="px-2 text-white!">{projectInfo?.name}</span>
        </Link>
      </div>
    )
  );
}

export function Container({ children }: { children?: ReactNode }) {
  return (
    <div
      className={classNames(
        'border-primary-7 bg-primary-9 text-light sticky top-0 flex h-screen w-[45px]',
        'flex-col items-center justify-center gap-2 border-r-[1px] transition-transform ease-in-out will-change-auto'
      )}
    >
      {children}
    </div>
  );
}

export default function SideMenu({ lab, project, links }: SideMenuProps) {
  const result = useAtomValue(unwrap(virtualLabDetailAtomFamily(lab.id)));
  return (
    <Container>
      <div className="flex w-[45px] grow flex-col items-center justify-between gap-14 overflow-hidden">
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
            <div className="text-primary-3 mt-2 flex w-full flex-col items-center gap-2">
              <Link
                key={`${lab.href}/${lab.id}`}
                href={lab.href}
                title={result?.virtual_lab.name}
                className="flex items-center justify-center text-center capitalize"
                style={{
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                }}
              >
                <span className="flex-none">Virtual lab:</span>
                <span className="mt-3 inline-block overflow-hidden font-semibold whitespace-nowrap text-white">
                  {result?.virtual_lab.name}
                </span>
              </Link>
            </div>
          )}
        </div>

        <div className="text-primary-3 mb-5 flex w-full flex-col items-center gap-2 overflow-hidden">
          <Tooltip title="Documentation" placement="topLeft">
            <Link href="/app/documentation" className="flex h-10 w-10 items-center justify-center">
              <DocumentationIcon iconColor="#91d5ff" className="h-3 w-auto" />
            </Link>
          </Tooltip>
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
    </Container>
  );
}
