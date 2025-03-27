import Image from "next/image";
import { GraphDataImageProps, SingleCircuitListView } from "../../../type";

export default function OverviewSection({
    content
}:{
    content: SingleCircuitListView;
}) {

    return (
        <div className="relative w-full flex flex-col">
            {
                content.overview.cellStatistics.length > 0 && (
                    <div className="relative w-full flex flex-col">     
                        <div className="w-full bg-primary-8 text-white font-normal text-xl px-4 py-3 mb-12">
                            Cell Statistics
                        </div>
                        <div className="relative w-full flex flex-col">
                            {
                                content.overview.cellStatistics.map((singleImage: GraphDataImageProps) => (
                                    <Image
                                        src={singleImage.src}
                                        alt={singleImage.alt}
                                        width={singleImage.width}
                                        height={singleImage.height}
                                        key={singleImage.alt}
                                    />
                                ))
                            }
                        </div>
                    </div>
                )
            } 
            {
                content.overview.cellStatistics.length > 0 && (
                    <div className="relative w-full flex flex-col">     
                        <div className="w-full bg-primary-8 text-white font-normal text-xl px-4 py-3 mb-12">
                            Network Statistics
                        </div>
                        <div className="relative w-full flex flex-col">
                            {
                                content.overview.networkStatistics.map((singleImage: GraphDataImageProps) => (
                                    <Image
                                        src={singleImage.src}
                                        alt={singleImage.alt}
                                        width={singleImage.width}
                                        height={singleImage.height}
                                        key={singleImage.alt}
                                    />
                                ))
                            }
                        </div>
                    </div>
                )
            } 
        </div>
    )
}