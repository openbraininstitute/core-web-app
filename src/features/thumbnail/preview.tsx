import { useEffect, useState } from "react";
import { useInView } from "react-intersection-observer";
import { Empty, Skeleton } from "antd";
import Image from "next/image";


import buildQueryString from "@/util/query-params-builder";
import { AssetTypeToEndpoint } from "@/api/thumbnail-svc/context";
import { thumbnailGenerationBaseUrl } from "@/config";
import { EntityCoreResource, IAsset } from "@/api/entitycore/types/shared/global";
import { tryCatch } from "@/api/utils";
import { getAssets } from "@/api/entitycore/queries/assets";
import { ENTITY_CORE_DATA_TYPES } from "@/api/entitycore/types/shared/context";

export default function PreviewThumbnail({
    resource,
    className,
    dpi,
    height,
    width,
    target,
    alt = 'img preview',
}: {
    resource: EntityCoreResource
    className?: string;
    dpi?: number;
    height: number;
    width: number;
    target?: 'simulation' | 'stimulus';
    alt?: string;
}) {
    const endpoint = AssetTypeToEndpoint[resource.type];
    const { ref, inView } = useInView({
        threshold: 0.2,
    });


    const [thumbnail, setThumbnail] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        async function buildThumbnail() {
            const { data: result, error } = await tryCatch(getAssets({ entityType: resource.type, entityId: resource.id }));
            if (error) return null;
            const assets = result?.data;
            let asset: IAsset | undefined;
            if (resource.type === "reconstruction-morphology") {
                asset = assets?.find((asset) => asset.contentType === ENTITY_CORE_DATA_TYPES.RECONSTRUCTION_MORPHOLOGY.assetExtension);
            }
            if (!asset) return null;
            const queryParams = buildQueryString({
                dpi,
                target,
            });
            const requestUrl = `${thumbnailGenerationBaseUrl}/generate/core/${endpoint}?&${queryParams}`;
            // TODO: call new thumbnail api

        }
        if (inView) {
            setLoading(true);
            // TODO: buildThumbnail();
            // authFetch(requestUrl, {
            //     method: 'GET',
            //     headers: { Accept: 'image/png' },
            // })
            //     .then((response) => response.blob())
            //     .then((blob) => {
            //         if (blob.type === 'image/png') {
            //             setThumbnail(URL.createObjectURL(blob));
            //         }
            //         setLoading(false);
            //     })
            //     .catch(() => setLoading(false));
        }
    }, [dpi, target, endpoint, inView]);

    if (thumbnail) {
        return <Image alt={alt} className={className} height={height} src={thumbnail} width={width} />;
    }

    return (
        <div ref={ref} className="flex items-center justify-center" style={{ height, width }}>
            {loading ? (
                <Skeleton.Image
                    active={loading}
                    className="!h-full !w-full rounded-none"
                    rootClassName="!h-full !w-full"
                />
            ) : (
                <Empty description="No thumbnail available" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
        </div>
    );
}