import { virtualLabRootApi } from "@/api/virtual-lab-svc/utils";
import type { IBrainRegionPreference } from "@/features/brain-region-hierarchy/types";
import { log } from "@/utils/logger";

const BASE_URI = "/users/preferences/brain-region-hierarchy";

/**
 * Response shape for brain region preference API
 */
export interface VlmBrainRegionPreferenceResponse {
  message: string;
  data: {
    user_id: string;
    preference: IBrainRegionPreference;
    updated_at: string;
  } | null;
}

/**
 * Fetches the user's brain region hierarchy preference from the API
 *
 * @returns Promise with the user's brain region preference, or null if not set
 */
export async function getBrainRegionPreference(): Promise<VlmBrainRegionPreferenceResponse | null> {
  try {
    const api = await virtualLabRootApi();
    return await api.get<VlmBrainRegionPreferenceResponse>(BASE_URI);
  } catch (error) {
    log("warn", "Failed to fetch brain region preference from API:", error);
    return null;
  }
}

/**
 * Sets the user's brain region hierarchy preference (fire-and-forget)
 *
 * This is a non-blocking operation - the function returns immediately
 * and any errors are logged but not thrown, ensuring the UI remains responsive
 *
 * @param preference - The brain region preference to persist
 */
export function setBrainRegionPreference(
  preference: IBrainRegionPreference,
): void {
  // Fire-and-forget: execute async but don't await
  (async () => {
    try {
      const api = await virtualLabRootApi();
      await api.post(BASE_URI, {
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: preference,
      });
    } catch (error) {
      // Log but don't throw - this is intentionally fire-and-forget
      log("warn", "Failed to persist brain region preference to API:", error);
    }
  })();
}
