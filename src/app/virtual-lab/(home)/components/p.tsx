import React, { useState } from 'react';
import { UserOutlined, ArrowRightOutlined, FolderOutlined, PlusOutlined, MenuOutlined, CloseOutlined } from '@ant-design/icons';

function SidebarItem({ label, count }: { label: string; count: number }) {
    return (
        <div className="flex items-center px-4 py-2 text-white hover:bg-white/5 cursor-pointer border border-white/10 rounded-lg">
            <span className="flex-1">{label}</span>
            <span className="text-white/70">{count}</span>
        </div>
    );
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

function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return (
        <div className={`${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed inset-y-0 left-0 z-30 w-64 bg-[#0a1333] p-6 transition-transform duration-300 ease-in-out lg:relative`}>
            <button onClick={onClose} className="absolute top-4 right-4 text-white lg:hidden">
                <CloseOutlined className="w-6 h-6" />
            </button>
            <div className="mb-12">
                <h1 className="text-white text-2xl font-semibold">Open Brain Platform</h1>
            </div>

            <div className="space-y-3 mb-12">
                <SidebarItem label="Virtual Labs" count={3} />
                <div className="w-full h-px bg-white/10" />
                <SidebarItem label="Projects" count={9} />
            </div>

            <div>
                <h2 className="text-white text-xl font-semibold mb-4">Explore</h2>
                <div className="bg-[#1a2d6d]/60 rounded-[12px] p-4">
                    <div className="text-white mb-4">Browse resources</div>
                    <img
                        src="https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&q=80&w=300&h=200"
                        alt="Brain scan"
                        className="w-full h-32 object-cover rounded-[8px]"
                    />
                </div>
            </div>
        </div>
    );
}

function App() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-[#0a1333] flex">
            {/* Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* Main Content */}
            <div className="flex-1 p-4 md:p-8">
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

export default App;