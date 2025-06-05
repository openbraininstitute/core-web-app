'use client';

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
      <div className="mt-2 flex w-full flex-col items-center justify-center overflow-hidden">
        <Link
          key={lab.id}
          href={project.href}
          className="overflow-hidden text-ellipsis whitespace-nowrap text-center font-semibold capitalize hover:text-white"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
          }}
        >
          {projectInfo && <DownOutlined className="my-3 text-primary-3" />}
          {projectInfo?.name}
        </Link>
      </div>
    )
  );
}

export default function SideMenu({ lab, project, links }: SideMenuProps) {
  const result = useAtomValue(unwrap(virtualLabDetailAtomFamily(lab.id)));
  return (
    <div className="sticky top-0 flex h-screen w-[45px] flex-col items-center justify-center gap-2 border-r-[1px] border-primary-7 bg-primary-9 text-light transition-transform ease-in-out will-change-auto">
      <div className="flex w-[45px] grow flex-col items-center justify-between gap-3 overflow-hidden">
        <div className="mt-2 flex w-full flex-col items-center gap-3 overflow-hidden">
          {links
            .slice()
            .reverse()
            .map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className={classNames(
                  'mt-2 w-[21px] font-semibold capitalize hover:text-white',
                  link.styles
                )}
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                {link.content}
              </Link>
            ))}
          {links.length > 0 && <UpOutlined className="ml-1 mt-2 text-primary-3" />}
          {project && <ProjectLink project={project} lab={lab} />}
          {!!result && (
            <div className="mt-2 flex w-full flex-col items-center gap-2 overflow-hidden text-primary-3">
              <Link
                key={`${lab.href}/${lab.id}`}
                href={lab.href}
                className="overflow-hidden text-ellipsis whitespace-nowrap text-center capitalize"
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

        <div className="mb-5 flex w-full flex-col items-center gap-2 overflow-hidden text-primary-3">
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
          <Link href="/app/virtual-lab" className="group cursor-pointer">
            <HomeOutlined className="group-hover:text-white" />
          </Link>
        </div>
      </div>
    </div>
  );
}
