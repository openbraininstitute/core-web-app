import { ReactNode } from 'react';

interface CircuitDetailPageLayoutProps {
    children: ReactNode;
}

export default function CircuitDetailPageLayout({ children }: CircuitDetailPageLayoutProps) {

    return (
        <div className="relative w-full p-12">
            {
                children
            }
        </div>
    )
}