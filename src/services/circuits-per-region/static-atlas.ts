import DataURL from './static-atlas.txt';

export interface StaticAtlasRegion {
  id: string;
  name: string;
}

type Tree = [id: string, name: string, children: Tree[]];

export class StaticAtlas {
  static async getInstance(treeOverride?: Tree): Promise<StaticAtlas> {
    if (treeOverride) return new StaticAtlas(treeOverride);

    const tree = (await (await fetch(DataURL)).json()) as Tree;
    return new StaticAtlas(tree);
  }

  private readonly rootId: string;

  private readonly regionsById = new Map<string, StaticAtlasRegion>();

  private readonly regionsByName = new Map<string, StaticAtlasRegion>();

  private readonly parentIds = new Map<string, string>();

  private readonly childrenIds = new Map<string, string[]>();

  private constructor(tree: Tree) {
    const [id] = tree;
    this.rootId = id;
    this.register(tree);
  }

  getRootRegion() {
    return this.getRegionById(this.rootId);
  }

  getRegionById(regionId: string): StaticAtlasRegion | undefined {
    return this.regionsById.get(regionId);
  }

  getRegionByName(regionName: string): StaticAtlasRegion | undefined {
    return this.regionsByName.get(simplifyName(regionName));
  }

  getParentId(regionId: string) {
    return this.parentIds.get(regionId);
  }

  getChildrenIds(regionId: string) {
    return this.childrenIds.get(regionId) ?? [];
  }

  getAncestorIds(regionId: string): string[] {
    const ancestorIds: string[] = [];
    let parentId = this.getParentId(regionId);
    while (parentId) {
      ancestorIds.push(parentId);
      parentId = this.getParentId(parentId);
    }
    return ancestorIds;
  }

  getFamilyIds(regionId: string): string[] {
    const family: string[] = [regionId, ...this.getAncestorIds(regionId)];
    for (const childId of this.getChildrenIds(regionId)) {
      this.addFamilyIdsRecursively(childId, family);
    }
    return family;
  }

  private addFamilyIdsRecursively(regionId: string, family: string[]) {
    family.push(regionId);
    for (const childId of this.getChildrenIds(regionId)) {
      this.addFamilyIdsRecursively(childId, family);
    }
  }

  isDescendentOf(candidateRegionId: string, parentRegionId: string) {
    const parentRegion = this.getRegionById(parentRegionId);
    if (!parentRegion) return false;

    for (const childId of this.getChildrenIds(parentRegionId)) {
      if (childId === candidateRegionId) return true;

      if (this.isDescendentOf(candidateRegionId, childId)) return true;
    }
    return false;
  }

  /**
   * @returns `true` if `candidateRegionId` is an ancestor or a descendent of `familyMemberRegionId`.
   */
  isFamilyOf(candidateRegionId: string, familyMemberRegionId: string) {
    if (candidateRegionId === familyMemberRegionId) return true;
    let parentId = this.getParentId(familyMemberRegionId);
    while (parentId) {
      if (candidateRegionId === parentId) return true;

      parentId = this.getParentId(parentId);
    }
    return this.isDescendentOf(candidateRegionId, familyMemberRegionId);
  }

  private register(node: Tree, parentId?: string) {
    const [id, name, children] = node;
    const region: StaticAtlasRegion = {
      id,
      name,
    };
    this.regionsById.set(id, region);
    this.regionsByName.set(simplifyName(name), region);
    if (parentId) {
      this.parentIds.set(id, parentId);
    }
    this.childrenIds.set(
      id,
      children.map(([childId]) => childId)
    );
    children.forEach((child) => this.register(child, id));
  }
}

function simplifyName(name: string) {
  return name.trim().toLowerCase();
}
