'use client'

import { CircuitSchemaProps, DownloadItemProps } from "../../type";
import DownloadItem from "./DownloadItem";

import HeaderDownloadModal from "./HeaderDownloadModal";

const FILE_TYPES_DESCRIPTION = [
    {
        name: "Connectivity Matrices",
        description: "The connectome, sparse connectivity matrix and node properties  in Connectome Utilities format, [See more here](https://github.com/openbraininstitute/ConnectomeUtilities/blob/main/README.md).",
        extension: "h5"
    },
    {
        name: "Morphologies",
        description: "The neuronal morphologies used in the circuit grouped in h5 containers, [See more here](https://morphio.readthedocs.io/en/latest/python.html).",
        extension: "h5"
    },
    {
        name: "Node files",
        description: "Files containing information on the population of neurons in the circuit,  [See more here](https://github.com/AllenInstitute/sonata/blob/master/docs/SONATA_DEVELOPER_GUIDE.md#neuron_networks_nodes).",
        extension: "h5"
    },
    {
        name: "Edge files",
        description: "Files containing information on the connections between neurons in the circuit, [See more here](https://github.com/AllenInstitute/sonata/blob/master/docs/SONATA_DEVELOPER_GUIDE.md#neuron_networks_edges).",
        extension: "h5"
    }
]

export default function DownloadContainer({
    content,
    setIsDownloadModalOpen,
}:{
    content: CircuitSchemaProps;
    setIsDownloadModalOpen: (isOpen: boolean) => void;
}) {

    // const [totalFileSize, setTotalFileSize] = useState<number>(0);
    // const [selectedFiles, setSelectedFiles] = useState<object[] | null>(null);


    return (
        <div className="fixed bottom-3 right-3 z-[999999] w-[36vw] h-screen flex flex-col p-8 bg-primary-9">
            <HeaderDownloadModal setIsDownloadModalOpen={setIsDownloadModalOpen} />


            <div className="w-full flex flex-col">
                {
                    content.files.map((item: DownloadItemProps) => {
                        
                        return (
                            <DownloadItem item={item} key={`download-option_${item.name}`} />
                        )
                    }
                        
                    )
                }
            </div>
            {content.key}
        </div>
    )

}