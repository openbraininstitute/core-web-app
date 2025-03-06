import { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import SimpleErrorComponent from '@/components/GenericErrorFallback';
import SideBar from '@/components/VirtualLab/side-bar/account-sidebar';
import User from '@/components/VirtualLab/subscription-billing/user';

type Props = {
    children: ReactNode
}


export default function layout({ children }: Props) {
    return (
        <div className="flex h-screen flex-col bg-primary-9 p-5 text-white">
            <div className="h-full gap-12 overflow-y-auto overflow-x-hidden no-scrollbar">
                <SideBar />
                <ErrorBoundary FallbackComponent={SimpleErrorComponent}>
                    <div className='flex h-full flex-col w-[calc(100%-20rem)] flex-grow ml-80'>
                        <User />
                        <div className='w-full h-full flex-grow'>
                            {children}
                        </div>
                    </div>
                    {/* <div className='grid grid-rows-[max-content_1fr] min-h-[calc(100vh-)] h-full overflow-y-auto primary-scrollbar'> */}
                    {/* </div> */}
                </ErrorBoundary>
            </div>
        </div>
    )
}
