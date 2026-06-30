export type VirtualLabCreateInput = {
  name: string;
  description: string;
  entity: string;
};

export type ProjectCreationBody = {
  name: string;
  description?: string | null;
  contact_email?: string | null;
};

export type DeleteResult = {
  ok: boolean;
  status: number;
  body: string;
};

export type ResourceSummary = {
  id: string;
  name: string;
};

export type VirtualLabSummary = ResourceSummary;
export type ProjectSummary = ResourceSummary;

type CreatedResource = {
  id: string;
};

type ListResponse<T> = {
  data: T[];
  pagination: {
    total_items: number;
  };
};

const PAGE_SIZE = 100;

function buildPath(path: string, query: Record<string, string>): string {
  return `${path}?${new URLSearchParams(query).toString()}`;
}

export class VirtualLabManagerApi {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly accessToken: string
  ) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async listVirtualLabs(): Promise<VirtualLabSummary[]> {
    return this.listResources('/virtual-labs', { scope: 'all' });
  }

  async listProjects(virtualLabId: string): Promise<ProjectSummary[]> {
    return this.listResources(`/virtual-labs/${encodeURIComponent(virtualLabId)}/projects`);
  }

  async createVirtualLab(input: VirtualLabCreateInput): Promise<string> {
    const response = await this.requestJson<CreatedResource>('/virtual-labs', {
      method: 'POST',
      body: JSON.stringify(input),
    });

    return response.id;
  }

  /**
   * Returns the shared virtual lab, creating it only if the user has none. The
   * test user may own a single virtual lab, so concurrent CI runs must reuse the
   * existing one rather than deleting and recreating it. Prefers an exact name
   * match, otherwise reuses whatever single lab the user already owns.
   */
  async ensureVirtualLab(input: VirtualLabCreateInput): Promise<{ id: string; created: boolean }> {
    const existing = await this.listVirtualLabs();
    const match = existing.find((lab) => lab.name === input.name) ?? existing[0];
    if (match) {
      return { id: match.id, created: false };
    }

    const id = await this.createVirtualLab(input);
    return { id, created: true };
  }

  async createProject(virtualLabId: string, input: ProjectCreationBody): Promise<string> {
    const response = await this.requestJson<CreatedResource>(
      `/virtual-labs/${encodeURIComponent(virtualLabId)}/projects`,
      {
        method: 'POST',
        body: JSON.stringify(input),
      }
    );

    return response.id;
  }

  async deleteProject(virtualLabId: string, projectId: string): Promise<DeleteResult> {
    return this.delete(
      `/virtual-labs/${encodeURIComponent(virtualLabId)}/projects/${encodeURIComponent(projectId)}`
    );
  }

  async deleteVirtualLab(virtualLabId: string): Promise<DeleteResult> {
    return this.delete(`/virtual-labs/${encodeURIComponent(virtualLabId)}`);
  }

  /**
   * resets the shared test user's server-side workspace hierarchy/species preference to a neutral "all species" selection
   * earlier runs can leave a stale or malformed (e.g. JSON-quoted) hierarchy id on this preference;
   * the app forwards it un-validated while the available-hierarchy list is loading, producing an intermittent 422 on brain-region-hierarchy
   * that stalls sidebar counts. Clearing it makes every run start from a valid state. Uses a raw request because the endpoint may answer 204 (no body)
   */
  async resetWorkspaceHierarchySpeciesPreference(): Promise<void> {
    const path = '/users/preferences/workspace-hierarchy-species';
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hierarchy_id: null,
        species_name: null,
        brain_region_id: null,
        brain_region_name: null,
        species_selection_mode: 'all',
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Virtual Lab Manager request failed: PATCH ${path} returned ${response.status}. ${body}`
      );
    }
  }

  private async listResources(
    path: string,
    queryOverrides: Record<string, string> = {}
  ): Promise<ResourceSummary[]> {
    const resources: ResourceSummary[] = [];

    for (let page = 1; ; page += 1) {
      const response = await this.requestJson<ListResponse<ResourceSummary>>(
        buildPath(path, {
          page: String(page),
          page_size: String(PAGE_SIZE),
          ...queryOverrides,
        })
      );

      resources.push(...response.data);
      if (response.data.length === 0 || resources.length >= response.pagination.total_items) {
        break;
      }
    }

    return resources;
  }

  private async requestJson<TResponse>(path: string, init: RequestInit = {}): Promise<TResponse> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...init.headers,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Virtual Lab Manager request failed: ${init.method ?? 'GET'} ${path} ` +
          `returned ${response.status}. ${body}`
      );
    }

    return (await response.json()) as TResponse;
  }

  private async delete(path: string): Promise<DeleteResult> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    return {
      ok: response.ok || response.status === 404,
      status: response.status,
      body: await response.text(),
    };
  }
}
