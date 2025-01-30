import { entityCorePublicProjectId, entityCorePublicVirtualLabId } from '@/config';

export const getEntityCorePublicContext = () => ({
    headers: {
        "virtual-lab-id": entityCorePublicVirtualLabId,
        "project-id": entityCorePublicProjectId,
    },
});

export const getEntityCoreContext = (virtualLabId?: string, projectId?: string) => ({
    headers: {
        "virtual-lab-id": virtualLabId ?? entityCorePublicVirtualLabId,
        "project-id": projectId ?? entityCorePublicProjectId,
    },
});
