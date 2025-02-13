"use client";

import React, { useState } from 'react';
import Image from 'next/image';

import { UserOutlined, ArrowRightOutlined, FolderOutlined, PlusOutlined, MenuOutlined, CloseOutlined } from '@ant-design/icons';
import Sidebar1, { Header, Content } from './components/side-bar';
import ObpLogoLink from '@/components/Logo/as-link';
import { basePath } from '@/config';


function SidebarItem({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center px-4 py-4 text-white text-base hover:bg-white hover:text-primary-9 hover:font-bold cursor-pointer border border-b-0 last:border-b border-white/10">
      <span className="flex-1">{label}</span>
      <span className='text-primary-3 hover:text-primary-9 font-bold'>{count}</span>
    </div>
  );
}

function ExploreItem() {
  return (
    <Image
      fill
      alt='multiple-brain-regions'
      src={`${basePath}/images/home/multiple-brain-regions-open-explore.webp`}
    />
  )
}

function LabCard({ title, lastUpdate, projects, members }: {
  title: string;
  lastUpdate: string;
  projects: number;
  members: number;
}) {
  return (
    <div className="bg-[#1a2d6d]/80 p-4 md:p-6 rounded-[12px]">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0 mb-4">
        <h2 className="text-xl md:text-2xl font-semibold text-white">{title}</h2>
        <button className="flex items-center text-white/90 hover:text-white text-sm whitespace-nowrap">
          Go to virtual lab
          <ArrowRightOutlined className="w-4 h-4 ml-1" />
        </button>
      </div>
      <div className="text-sm text-white/70 mb-4">
        Virtual lab's latest update: {lastUpdate}
      </div>
      <div className="w-full h-px bg-white/10 mb-4" />
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
        <div className="flex items-center text-white/80">
          <FolderOutlined className="w-4 h-4 mr-2" />
          Projects {projects}
        </div>
        <div className="flex items-center text-white/80">
          <UserOutlined className="w-4 h-4 mr-2" />
          Members {members}
        </div>
      </div>
    </div>
  );
}



export default function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-primary-9 flex">
      {/* Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} /> */}
      <Sidebar1 className='p-4'>
        <Header className='mb-10'>
          <ObpLogoLink />
        </Header>
        <Content>
          <div className='flex flex-col'>
            <SidebarItem label="Virtual Labs" count={3} />
            <SidebarItem label="Projects" count={9} />
          </div>
          <div className='mt-10'>
            <ExploreItem />
          </div>
        </Content>
      </Sidebar1>

      {/* Main Content */}
      <div className="p-4 md:p-8 relative flex min-h-svh flex-1 flex-col w-full">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden text-white mb-6"
        >
          <MenuOutlined className="w-6 h-6" />
        </button>

        <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
          <LabCard
            title="Institute of Neuroscience"
            lastUpdate="2 days ago"
            projects={23}
            members={9}
          />
          <LabCard
            title="Neuro California"
            lastUpdate="2 days ago"
            projects={23}
            members={9}
          />
          <LabCard
            title="Institute of Neuroscience"
            lastUpdate="2 days ago"
            projects={23}
            members={9}
          />
        </div>

        {/* Bottom Actions */}
        <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 flex flex-col sm:flex-row gap-2 sm:gap-4">
          <button className="bg-white text-[#0a1333] px-4 md:px-6 py-2.5 rounded-[8px] flex items-center justify-center hover:bg-white/90 font-medium">
            <PlusOutlined className="w-5 h-5 mr-2" />
            <span className="whitespace-nowrap">Create project</span>
          </button>
          <button className="bg-white text-[#0a1333] px-4 md:px-6 py-2.5 rounded-[8px] flex items-center justify-center hover:bg-white/90 font-medium">
            <PlusOutlined className="w-5 h-5 mr-2" />
            <span className="whitespace-nowrap">Create virtual lab</span>
          </button>
        </div>
      </div>
    </div>
  );
}
