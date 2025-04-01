''

import Image from "next/image";
import { useRef, useState } from "react";
import placeholderImage from "./circuit-preview-image_01.jpg";

export default function Visualiser({
    src,
    alt,
}:{
    src?: string;
    alt: string;
}) {

    const [scale, setScale] = useState<number>(1);
    const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [startPos, setStartPos] = useState<{x: number; y: number}>({ x: 0, y: 0 });
    const [isActive, setIsActive] = useState<boolean>(false);
  
    const containerRef = useRef<HTMLDivElement>(null);

    // ZOOM
    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (!isActive) return;
        const zoomFactor = 0.1;
        const newScale = scale + (e.deltaY > 0 ? -zoomFactor : zoomFactor);
        setScale(Math.max(0.5, Math.min(newScale, 5)));
      }; 
    
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isActive) {
            setIsActive(true);
            return;
          }
        setIsDragging(true);
        setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging || !isActive) return;
        setPosition({ x: e.clientX - startPos.x, y: e.clientY - startPos.y });
      };
    
    const handleMouseUp = () => setIsDragging(false);

    const handleReset = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    }

    return (
        <div
            ref={containerRef}
            className="relative w-full flex items-center justify-center my-24 bg-white overflow-hidden"
            style={{
                cursor: isActive ? "move" : "default",
            }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            >
                <button
                    type="button"
                    aria-label="Activate image navigation"
                    className="w-full h-full absolute top-0 left-0 bg-black/60 z-50 text-white text-4xl transition-all duration-300 ease-in-out"
                    style={{
                        opacity: isActive ? 0 : 1,
                        pointerEvents: isActive ? "none" : "auto",
                    }}
                    onClick={() => setIsActive(!isActive)}
                    >
                        Start zooming and dragging
                </button>
            <Image
                src={placeholderImage}
                width={1920}
                height={1080}
                alt={alt}
                className="relative z-10 select-none transition-all duration-300 ease-out"
                style={{
                    transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
                    transformOrigin: "center",
                    transition: isDragging ? "none" : "transform 0.1s ease-out",
                  }}
                priority
            />

            <div className="absolute top-4 right-4 z-20 flex flex-row items-center gap-x-4">
                Zoom: { Math.floor(scale * 100)}%
                <button
                    type="button"
                    className="relativeflex flex-row py-3 px-6 text-primary-9 font-normal text-sm bg-white border border-solid border-gray-400 rounded-full"
                    onClick={handleReset}
                    aria-label="Reset zoom and position"
                    >
                    Reset
                </button>
            </div>

        </div>
    )
}