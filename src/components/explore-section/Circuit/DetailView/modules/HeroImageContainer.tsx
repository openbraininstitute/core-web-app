import { useRef, useState } from "react";

import Image from "next/image";
import { InteractiveImageProps } from "../../type";

export default function HeroImageContainer({
    content,
}:{
    content: InteractiveImageProps;
}) {

    const containerRef = useRef<HTMLDivElement>(null);

    const [isActive, setIsActive] = useState<boolean>(false);
    const [scale, setScale] = useState<number>(1);
    const [position, setPosition] = useState<{x: number; y: number}>({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [dragStart, setDragStart] = useState<{x: number; y: number}>({ x: 0, y: 0 });

    // UNLOCKING ZOOMING
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.button === 0 && !isDragging) {
          setIsActive((prev) => !prev);
        }
      };

    // ZOOMING
    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (!isActive) return
        e.preventDefault();
        const zoomFactor = 0.1;
        const newScale = scale + (e.deltaY > 0 ? -zoomFactor : zoomFactor);

        setScale(Math.max(0.5, Math.min(8, newScale)));
    }

    // MOVING
    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }

    // DRAG
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        e.preventDefault();
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
    
        // Optional: Add boundary limits
        if (containerRef.current) {
          const container = containerRef.current;
          const imgWidth = content.width * scale;
          const imgHeight = content.height * scale;
          const maxX = (imgWidth - container.clientWidth) / 2;
          const maxY = (imgHeight - container.clientHeight) / 2;
    
          setPosition({
            x: Math.max(-maxX, Math.min(maxX, newX)),
            y: Math.max(-maxY, Math.min(maxY, newY)),
          });
        } else {
          setPosition({ x: newX, y: newY });
        }
      };

    // STOP DRAGGING
    const handleMouseUp = () => {
        setIsDragging(false);
        setIsActive(false);
    };

    // RESET BUTTON
    // Reset zoom and position
    const handleReset = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    return (
        <div
            ref={containerRef}
            onClick={handleClick}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className="relative w-full h-[70vh] bg-[#FAFAFA] overflow-hidden mb-20 flex items-center justify-center"
            >
                {
                    !isActive && (
                        <div className="absolute top-0 left-0 w-full h-full bg-black opacity-20 z-50 text-white font-normal text-3xl flex items-center justify-center transition-opacity duration-300 ease-linear hover:opacity-60 cursor-pointer">
                            Click to zoom and move
                        </div>

                    )
                }
            <Image
                src={content.src}
                width={1920}
                height={1080}
                alt={content.alt}
                className="relative z-10"
                style={{
                    transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
                    transition: isDragging ? "none" : "transform 0.2s ease-out",
                    cursor: isDragging ? "grabbing" : "grab",
                }}
                unoptimized
                />
                <div className="absolute top-3 right-3 z-40 flex flex-row items-center text-black font-normal text-base">
                    <div>
                        Zoom: {Math.round(scale * 100)}%
                    </div>
                    <button
                        type="button"
                        aria-label="Reset zoom and position"
                        onClick={handleReset}
                        className="bg-white px-4 py-2 rounded-full ml-3"
                        >
                        Reset
                    </button>
                </div>
        </div>
    )
}