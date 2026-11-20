import { useQuery } from '@tanstack/react-query';
import { isNil, isNotNil } from 'es-toolkit';
import { LayoutGroup, motion } from 'motion/react';
import { useDeferredValue, useId, useMemo, useState } from 'react';

import { dataBrowseListingUsesBrainRegionHierarchy } from '@/api/entitycore/types/extended-entity-type';
import { BrainRegionDirection } from '@/api/entitycore/types/shared/request';
import { WorkspaceScope, WorkspaceSection } from '@/constants';
import { EntityTypeGroup } from '@/entity-configuration/domain/group';
import { useBrainRegionRootHierarchyQuery } from '@/features/brain-region-hierarchy/context';
import { useAvailableHierarchySpeciesQuery } from '@/features/brain-region-hierarchy/hooks';
import { blockTypeOf, entitySearchQuery } from '@/features/logbook/api/entities';
import { EntityType, entityLooks } from '@/features/logbook/blocks/kinds';
import { groupLooks } from '@/features/logbook/editor/blocks/entity-look';
import { BouncyAccordion } from '@/features/logbook/elements/motion/bouncy-accordion';
import { hexOf } from '@/features/logbook/helpers';
import { useLogContext } from '@/features/logbook/log/context';
import { reasonOf } from '@/features/logbook/log/notice';
import { Icon } from '@/features/logbook/ui/icons';
import { BrowseEntityScope } from '@/features/views/listing/browse-entity';
import { DATA_BROWSE_ALLOWED_ENTITIES } from '@/features/views/listing/data-browse-entities';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/ui/molecules/select';
import {
  BrowseExperimentalDataExtendedTypes,
  ModelDataExtendedTypes,
  SimulationDataExtendedTypes,
} from '@/ui/segments/explore/helpers';
import { MiniDetailViewRenderer } from '@/ui/segments/mini-detail-view';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { TWorkspaceScope } from '@/constants';
import type { TEntityTypeGroup } from '@/entity-configuration/domain/group';
import type { TBrainRegionHierarchyOption } from '@/features/brain-region-hierarchy/types';
import type { ILook, TEntityType } from '@/features/logbook/blocks/kinds';
import type { IPickedEntity } from '@/features/logbook/log/context';

// A type in the left navigator: a Data grid, or the name search for types core has no grid for.
type TNavItem =
  | { readonly key: string; readonly label: string; readonly coreType: TExtendedEntitiesTypeDict }
  | { readonly key: string; readonly label: string; readonly blockType: TEntityType };

interface INavSection {
  readonly id: string;
  readonly title: string;
  readonly icon: string;
  readonly look: Omit<ILook, 'label'>;
  readonly items: readonly TNavItem[];
}

const allowed = new Set<string>(DATA_BROWSE_ALLOWED_ENTITIES);
const gridItems = (configs: Readonly<Record<string, { title: string; extendedType: string }>>) =>
  Object.values(configs)
    .filter((c) => allowed.has(c.extendedType))
    .map((c) => ({
      key: c.extendedType,
      label: c.title,
      coreType: c.extendedType as TExtendedEntitiesTypeDict,
    }));
const lookOf = (group: TEntityTypeGroup) =>
  groupLooks[group] ?? { colour: '#002766', tint: '#f0f2f5' };

// The Data page's own categories and types, in its order.
const SECTIONS: readonly INavSection[] = [
  {
    id: 'experimental',
    title: 'Experimental',
    icon: 'morphology',
    look: lookOf(EntityTypeGroup.Experimental),
    items: gridItems(BrowseExperimentalDataExtendedTypes),
  },
  {
    id: 'model',
    title: 'Model',
    icon: 'circuit',
    look: lookOf(EntityTypeGroup.Models),
    items: gridItems(ModelDataExtendedTypes),
  },
  {
    id: 'simulations',
    title: 'Simulations',
    icon: 'simulation',
    look: lookOf(EntityTypeGroup.Simulations),
    items: [
      ...gridItems(SimulationDataExtendedTypes),
      { key: EntityType.Simulation, label: 'Simulation result', blockType: EntityType.Simulation },
    ],
  },
];
const sectionOf = (key: string | undefined) =>
  SECTIONS.find((s) => s.items.some((i) => i.key === key));
const FIRST = SECTIONS[1]?.items.find((i) => i.key === 'circuit') ?? SECTIONS[0]?.items[0];
const FIRST_SECTION = sectionOf(FIRST?.key)?.id ?? null;

const SCOPES: readonly {
  readonly value: TWorkspaceScope;
  readonly label: string;
  readonly icon: string;
}[] = [
  { value: WorkspaceScope.Combined, label: 'All', icon: 'layers' },
  { value: WorkspaceScope.Project, label: 'This project', icon: 'people' },
  { value: WorkspaceScope.Public, label: 'Public', icon: 'globe' },
];

const ALL_SPECIES = 'all';
const PILL =
  'inline-flex h-[30px] flex-none items-center gap-1.5 rounded-full border-0 px-3 text-[13px] font-semibold text-primary-9 transition-colors hover:bg-white aria-pressed:bg-primary-9 aria-pressed:text-white';
const FILTER =
  'inline-flex h-9 min-w-0 items-center gap-2 rounded-full border border-rule bg-white px-3 text-[13px] font-semibold text-primary-9 transition-colors hover:border-neutral-2 disabled:cursor-not-allowed disabled:opacity-50';
// Core's popover and select draw an undefined fill and a black border; these match the trigger.
const MENU = 'rounded-2xl border border-rule bg-white p-1.5 text-primary-9 shadow-pop';
const MENU_ITEM =
  'flex w-full cursor-pointer items-center gap-2.5 rounded-xl py-1.5 pr-8 pl-1.5 text-left text-[13px] text-primary-9 outline-none hover:bg-fill-item-hover focus:bg-fill-item-hover';

type TPicks = Readonly<Record<string, readonly IPickedEntity[]>>;

export interface IEntityGridPickerProps {
  /** One pick (replacing a card) or many (linking). */
  readonly multiple: boolean;
  readonly onPick: (entities: readonly IPickedEntity[]) => void;
  readonly onClose: () => void;
}

/** Link entities through the Data page's categories and grids, filtered by species and region. */
export function EntityGridPicker({ multiple, onPick, onClose }: IEntityGridPickerProps) {
  const gridId = useId();
  const [active, setActive] = useState<TNavItem | undefined>(FIRST);
  const [openSection, setOpenSection] = useState<string | null>(FIRST_SECTION);
  // Narrow screens: the types are a drawer over the dialog, opened from the type button.
  const [navOpen, setNavOpen] = useState(false);
  const [scope, setScope] = useState<TWorkspaceScope>(WorkspaceScope.Combined);
  const [hierarchyId, setHierarchyId] = useState<string>(ALL_SPECIES);
  const [region, setRegion] = useState<{ readonly id: string; readonly label: string } | null>(
    null
  );
  const [picks, setPicks] = useState<TPicks>({});
  // The grid's own rows for what is ticked in it, so it shows them ticked on every page.
  const [rows, setRows] = useState<Readonly<Record<string, EntityCoreIdentifiableNamed[]>>>({});
  const [preview, setPreview] = useState<{
    readonly record: EntityCoreObjectTypes;
    readonly dataType: TExtendedEntitiesTypeDict;
  } | null>(null);

  const species = hierarchyId === ALL_SPECIES ? null : hierarchyId;
  const tree = useBrainRegionRootHierarchyQuery(isNil(species) ? undefined : { hId: species });
  const hierarchies = useAvailableHierarchySpeciesQuery().remoteAvailableHierarchies ?? [];
  const coreType = isNotNil(active) && 'coreType' in active ? active.coreType : null;
  const usesRegion = isNotNil(coreType) && dataBrowseListingUsesBrainRegionHierarchy(coreType);
  // A region narrows to itself; a species alone narrows to its tree's root, as the Data page does.
  const regionId = region?.id ?? (isNil(species) ? null : (tree.result.root?.id ?? null));
  const regionParams = useMemo(
    () =>
      usesRegion && isNotNil(regionId)
        ? {
            within_brain_region_brain_region_id: regionId,
            within_brain_region_direction: BrainRegionDirection.ASCENDANTS_AND_DESCENDANTS,
          }
        : undefined,
    [usesRegion, regionId]
  );
  const all = SECTIONS.flatMap((s) => s.items).flatMap((i) => picks[i.key] ?? []);
  const activeSection = sectionOf(active?.key);
  const heading =
    isNil(active) || isNil(activeSection) ? null : (
      <TypeChip section={activeSection} label={active.label} onOpen={() => setNavOpen(true)} />
    );

  // A single pick is exclusive across types; many picks are kept per type.
  const choose = (key: string, chosen: readonly IPickedEntity[]): void =>
    setPicks((current) => (multiple ? { ...current, [key]: chosen } : { [key]: chosen.slice(-1) }));
  const chooseRows = (selected: EntityCoreIdentifiableNamed[]): void => {
    if (isNil(active) || isNil(coreType)) return;
    const kept = multiple ? selected : selected.slice(-1);
    setRows((current) => (multiple ? { ...current, [active.key]: kept } : { [active.key]: kept }));
    choose(
      active.key,
      kept.map((row) => ({ id: row.id, name: row.name, type: blockTypeOf(coreType) }))
    );
  };
  const toggle = (entity: IPickedEntity): void => {
    if (isNil(active)) return;
    const current = picks[active.key] ?? [];
    choose(
      active.key,
      current.some((p) => p.id === entity.id)
        ? current.filter((p) => p.id !== entity.id)
        : [...current, entity]
    );
  };
  const confirm = (): void => {
    if (all.length === 0) return;
    onPick(all);
    onClose();
  };
  const select = (item: TNavItem): void => {
    setActive(item);
    setPreview(null);
    setNavOpen(false);
  };

  return (
    <div className="fixed inset-0 z-41 grid place-items-center bg-[rgba(0,16,38,0.32)] p-4">
      <section
        className="logbook-card relative flex h-[min(860px,calc(100vh-32px))] w-[min(1360px,calc(100vw-32px))] flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={multiple ? 'Link entities' : 'Replace the entity'}
      >
        <header className="flex flex-none items-center gap-3 border-b border-rule-soft px-5 py-3.5 max-sm:px-3">
          <span className="grid size-[34px] flex-none place-items-center rounded-full bg-primary-0 text-primary-7 max-sm:hidden">
            <Icon name={multiple ? 'link' : 'replace'} size={16} />
          </span>
          <h2 className="mr-auto min-w-0 truncate text-[17px] font-bold text-primary-9">
            {multiple ? 'Link entities' : 'Replace the entity'}
          </h2>
          {/* biome-ignore lint/a11y/useSemanticElements: a segmented button group, not a form fieldset */}
          <div
            className="flex h-[34px] items-center rounded-full bg-neutral-1 p-0.5"
            role="group"
            aria-label="Scope"
          >
            {SCOPES.map((s) => (
              <button
                key={s.value}
                type="button"
                className={PILL}
                aria-pressed={scope === s.value}
                aria-label={s.label}
                title={s.label}
                onClick={() => setScope(s.value)}
              >
                <Icon name={s.icon} size={14} />
                <span className="max-sm:hidden">{s.label}</span>
              </button>
            ))}
          </div>
          <button type="button" className="modal-close" aria-label="Close" onClick={onClose}>
            <Icon name="close" size={14} stroke={2.4} />
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          {navOpen ? (
            <button
              type="button"
              className="absolute inset-0 z-55 cursor-default border-0 bg-[rgba(0,16,38,0.32)] md:hidden"
              aria-label="Close the list of types"
              onClick={() => setNavOpen(false)}
            />
          ) : null}
          {/* A column from md up; below, the same drawer as the list of logs, inside the dialog. */}
          <nav
            className="scroll-thin w-[264px] flex-none overflow-y-auto bg-white p-3 max-md:drawer max-md:absolute max-md:z-60 max-md:w-[min(360px,calc(100%-40px))]"
            data-open={navOpen}
            aria-label="Entity types"
            onKeyDown={(event) => event.key === 'Escape' && setNavOpen(false)}
          >
            <div className="mb-2 flex items-center justify-between pl-1 md:hidden">
              <span className="label-caps">Entity types</span>
              <button
                type="button"
                className="modal-close"
                aria-label="Close the list of types"
                onClick={() => setNavOpen(false)}
              >
                <Icon name="close" size={14} stroke={2.4} />
              </button>
            </div>
            <LayoutGroup id={`${gridId}-types`}>
              <BouncyAccordion
                value={openSection}
                onValueChange={setOpenSection}
                classNames={{ item: 'shadow-block-btn' }}
                items={SECTIONS.map((section) => ({
                  id: section.id,
                  icon: (
                    <span
                      className="grid size-7 place-items-center rounded-full"
                      style={{ background: section.look.tint, color: section.look.colour }}
                    >
                      <Icon name={section.icon} size={15} />
                    </span>
                  ),
                  title: (
                    <span className="flex items-center gap-2">
                      <span className="flex min-w-0 flex-col">
                        {section.title}
                        {/* A closed category still says which of its types is chosen. */}
                        {section === activeSection && openSection !== section.id ? (
                          <span
                            className="truncate text-[12px] font-semibold"
                            style={{ color: section.look.colour }}
                          >
                            {active?.label}
                          </span>
                        ) : null}
                      </span>
                      <PickCount
                        count={section.items.reduce((n, i) => n + (picks[i.key]?.length ?? 0), 0)}
                      />
                    </span>
                  ),
                  description: (
                    <TypeList
                      section={section}
                      activeKey={active?.key}
                      picks={picks}
                      onSelect={select}
                    />
                  ),
                }))}
              />
            </LayoutGroup>
          </nav>

          <div
            className={cn(
              'grid min-h-0 min-w-0 flex-1 gap-3 p-3',
              isNil(preview)
                ? "grid-cols-1 [grid-template-areas:'body']"
                : "grid-cols-[minmax(0,1fr)_minmax(320px,400px)] [grid-template-areas:'body_mini-view']"
            )}
          >
            {isNil(active) ? null : 'blockType' in active ? (
              <QuickList
                type={active.blockType}
                heading={heading}
                picked={picks[active.key] ?? []}
                onToggle={toggle}
              />
            ) : (
              <BrowseEntityScope
                id={`${gridId}-${active.key}`}
                section={WorkspaceSection.Data}
                dataType={active.coreType}
                scope={scope}
                extraQueryParams={regionParams}
                extraToolbarSlots={{
                  entityType: heading,
                  brainRegion: (
                    <>
                      <SpeciesFilter
                        value={hierarchyId}
                        hierarchies={hierarchies}
                        onChange={(value) => {
                          setHierarchyId(value);
                          setRegion(null);
                        }}
                      />
                      <RegionFilter
                        options={isNil(species) ? [] : tree.result.options}
                        value={region}
                        disabled={isNil(species) || !usesRegion}
                        hint={
                          usesRegion
                            ? 'Pick a species to filter by brain region.'
                            : 'This type has no brain region to filter by.'
                        }
                        onChange={setRegion}
                      />
                    </>
                  ),
                }}
                requireBrainRegion={false}
                requireSpeciesSelector={false}
                requireScopeSelector={false}
                requireMiniDetailView={false}
                allowDownload={false}
                allowDelete={false}
                mainTableProps={{
                  selectionType: multiple ? 'checkbox' : 'radio',
                  selectedRows: rows[active.key] ?? [],
                  onRowsSelected: chooseRows,
                  hideSelectAll: !multiple,
                  onCellClick: (_basePath, record, recordType) =>
                    setPreview({ record: record as EntityCoreObjectTypes, dataType: recordType }),
                }}
                classNames={{
                  container: 'h-full min-h-0 w-full min-w-0 overflow-hidden [grid-area:body]',
                }}
              />
            )}
            {isNil(preview) ? null : (
              <div className="h-full min-h-0 [grid-area:mini-view]">
                <MiniDetailViewRenderer
                  section={WorkspaceSection.Data}
                  record={preview.record}
                  dataType={preview.dataType}
                  theme="light"
                  onClose={() => setPreview(null)}
                  openDetailsInNewTab
                  hideUseModelAction
                />
              </div>
            )}
          </div>
        </div>

        <footer className="flex flex-none items-center justify-end gap-3 border-t border-rule-soft px-5 py-3">
          <button
            type="button"
            className="h-10 rounded-full border-0 px-4 text-[14px] font-semibold text-primary-9 hover:bg-fill-2"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-navy inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={all.length === 0}
            onClick={confirm}
          >
            <Icon name={multiple ? 'link' : 'replace'} size={16} />
            {!multiple
              ? 'Replace'
              : all.length === 0
                ? 'Link entities'
                : `Link ${all.length} ${all.length === 1 ? 'entity' : 'entities'}`}
          </button>
        </footer>
      </section>
    </div>
  );
}

function PickCount({
  count,
  inverted = false,
}: {
  readonly count: number;
  readonly inverted?: boolean;
}) {
  if (count === 0) return null;
  return (
    <span
      className={cn(
        'grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold',
        inverted ? 'bg-white text-primary-9' : 'bg-primary-6 text-white'
      )}
    >
      {count}
    </span>
  );
}

// The open category's types; the chosen one wears a pill that slides between rows.
function TypeList({
  section,
  activeKey,
  picks,
  onSelect,
}: {
  readonly section: INavSection;
  readonly activeKey: string | undefined;
  readonly picks: TPicks;
  readonly onSelect: (item: TNavItem) => void;
}) {
  return (
    <ul className="flex flex-col gap-0.5">
      {section.items.map((item) => {
        const current = item.key === activeKey;
        return (
          <li key={item.key}>
            <button
              type="button"
              className="group relative flex h-9 w-full items-center gap-2.5 rounded-xl px-2.5 text-left text-[13px] font-semibold text-primary-9 outline-none transition-colors hover:bg-fill-item-hover focus-visible:bg-fill-item-hover aria-[current=page]:text-white aria-[current=page]:hover:bg-transparent"
              aria-current={current ? 'page' : undefined}
              onClick={() => onSelect(item)}
            >
              {current ? (
                <motion.span
                  layoutId="logbook-picker-type"
                  className="absolute inset-0 rounded-xl bg-primary-9 shadow-navy-btn"
                  transition={{ type: 'spring', duration: 0.45, bounce: 0.25 }}
                />
              ) : null}
              <span
                className="relative size-2 flex-none rounded-full transition-transform duration-300 ease-out group-hover:scale-150 group-aria-[current=page]:scale-125"
                style={{ background: current ? '#ffffff' : section.look.colour }}
              />
              <span className="relative min-w-0 flex-1 truncate transition-transform duration-300 ease-out group-hover:translate-x-1 group-aria-[current=page]:translate-x-0.5">
                {item.label}
              </span>
              <span className="relative">
                <PickCount count={picks[item.key]?.length ?? 0} inverted={current} />
              </span>
              <span className="relative -translate-x-1.5 opacity-0 transition-[opacity,transform] duration-300 ease-out group-hover:translate-x-0 group-hover:opacity-100 group-aria-[current=page]:translate-x-0 group-aria-[current=page]:opacity-100">
                <Icon name="arrowRight" size={14} />
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

// What the grid lists, in the colour of its category, so the table reads as the chosen type.
// Narrow screens: only its icon, a button that opens the types drawer.
function TypeChip({
  section,
  label,
  onOpen,
}: {
  readonly section: INavSection;
  readonly label: string;
  readonly onOpen: () => void;
}) {
  const style = { background: section.look.tint, color: section.look.colour };
  return (
    <>
      <span
        className="inline-flex h-9 flex-none items-center gap-2 rounded-full pr-3.5 pl-1 text-[13px] font-semibold max-md:hidden"
        style={style}
      >
        <span className="grid size-7 place-items-center rounded-full bg-white">
          <Icon name={section.icon} size={14} />
        </span>
        <span className="opacity-75">{section.title}</span>
        <Icon name="chevronRight" size={12} stroke={2.4} />
        <span className="text-primary-9">{label}</span>
      </span>
      <button
        type="button"
        className="grid size-9 flex-none place-items-center rounded-full border-0 outline-none focus-visible:ring-2 focus-visible:ring-primary-4 md:hidden"
        style={style}
        aria-label={`${section.title}, ${label}. Choose another type`}
        title={`${section.title} › ${label}`}
        data-testid="logbook-picker-types"
        onClick={onOpen}
      >
        <Icon name={section.icon} size={15} />
      </button>
    </>
  );
}

// In the trigger of a narrow screen, a filter shows its icon only; its list keeps the names.
const TRIGGER_NAME = 'max-md:[[data-slot=select-trigger]_&]:hidden';

function SpeciesBadge({ name }: { readonly name: string | null }) {
  return (
    <span className="grid size-6 flex-none place-items-center rounded-full bg-primary-0 text-[11px] font-bold text-primary-7">
      {isNil(name) ? <Icon name="globe" size={13} /> : name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function SpeciesFilter({
  value,
  hierarchies,
  onChange,
}: {
  readonly value: string;
  readonly hierarchies: readonly {
    readonly id: string;
    readonly species: { readonly displayName: string };
  }[];
  readonly onChange: (value: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={cn(FILTER, 'w-auto pl-1.5 max-md:pr-1.5')}
        icoClassName="max-md:hidden"
        aria-label="Species"
      >
        <SelectValue placeholder="All species" />
      </SelectTrigger>
      <SelectContent className={cn(MENU, 'min-w-[220px]')}>
        <SelectItem value={ALL_SPECIES} className={MENU_ITEM}>
          <SpeciesBadge name={null} />
          <span className={TRIGGER_NAME}>All species</span>
        </SelectItem>
        {hierarchies.map((h) => (
          <SelectItem key={h.id} value={h.id} className={MENU_ITEM}>
            <SpeciesBadge name={h.species.displayName} />
            <span className={TRIGGER_NAME}>{h.species.displayName}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const REGION_MATCHES = 60;

// A searchable brain region list of the chosen species; the first matches only, to stay quick.
function RegionFilter({
  options,
  value,
  disabled,
  hint,
  onChange,
}: {
  readonly options: readonly TBrainRegionHierarchyOption[];
  readonly value: { readonly id: string; readonly label: string } | null;
  readonly disabled: boolean;
  readonly hint: string;
  readonly onChange: (region: { readonly id: string; readonly label: string } | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const needle = search.trim().toLowerCase();
  const matches = (
    needle.length === 0 ? options : options.filter((o) => o.label.toLowerCase().includes(needle))
  ).slice(0, REGION_MATCHES);
  const chosen = options.find((o) => o.value === value?.id);
  const pick = (next: { readonly id: string; readonly label: string } | null): void => {
    onChange(next);
    setOpen(false);
  };
  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(FILTER, 'max-w-[300px] pl-1.5 max-md:pr-1.5')}
          disabled={disabled}
          aria-label={`Brain region: ${value?.label ?? 'Any brain region'}`}
          title={disabled ? hint : (value?.label ?? 'Any brain region')}
        >
          <span className="grid size-6 flex-none place-items-center rounded-full bg-primary-0 text-primary-7">
            <Icon name="brain_region" size={13} />
          </span>
          <span className="truncate max-md:hidden">{value?.label ?? 'Any brain region'}</span>
          {isNil(chosen) ? null : (
            <span
              className="size-2 flex-none rounded-full"
              style={{ background: hexOf(chosen.data.color_hex_triplet) }}
            />
          )}
          <span className="flex max-md:hidden">
            <Icon name="chevronDown" size={12} />
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn(MENU, 'w-[340px] max-w-[calc(100vw-32px)]')}>
        <label className="mb-1.5 flex h-9 items-center gap-2 rounded-full bg-neutral-1 px-3 text-neutral-4">
          <Icon name="search" size={14} />
          <span className="sr-only">Search brain regions</span>
          <input
            className="min-w-0 flex-1 bg-transparent text-[13px] text-primary-9 outline-none"
            placeholder="Search brain regions…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <ul className="scroll-thin flex max-h-[300px] flex-col overflow-y-auto">
          <li>
            <button
              type="button"
              className={MENU_ITEM}
              aria-pressed={isNil(value)}
              onClick={() => pick(null)}
            >
              <span className="grid size-6 flex-none place-items-center rounded-full bg-primary-0 text-primary-7">
                <Icon name="brain_region" size={13} />
              </span>
              Any brain region
            </button>
          </li>
          {matches.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                className={cn(MENU_ITEM, 'aria-pressed:bg-primary-0')}
                aria-pressed={value?.id === o.value}
                onClick={() => pick({ id: o.value, label: o.label })}
              >
                <span className="grid size-6 flex-none place-items-center">
                  <span
                    className="size-2.5 rounded-full ring-2 ring-white"
                    style={{ background: hexOf(o.data.color_hex_triplet) }}
                  />
                </span>
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {value?.id === o.value ? <Icon name="check" size={14} /> : null}
              </button>
            </li>
          ))}
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-[13px] text-neutral-4">No region matches.</li>
          ) : null}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

// Types the Data page has no grid for: the name search, ten at a time.
function QuickList({
  type,
  heading,
  picked,
  onToggle,
}: {
  readonly type: TEntityType;
  readonly heading: ReactNode;
  readonly picked: readonly IPickedEntity[];
  readonly onToggle: (entity: IPickedEntity) => void;
}) {
  const { project } = useLogContext();
  const [search, setSearch] = useState('');
  const query = useDeferredValue(search);
  const results = useQuery(entitySearchQuery(type, query, project));
  const look = entityLooks[type];
  return (
    <div className="flex min-h-0 flex-col gap-2 [grid-area:body]">
      <div className="flex flex-none px-1 pt-2">{heading}</div>
      <label className="flex h-10 flex-none items-center gap-2 rounded-full bg-neutral-1 px-4 text-neutral-4">
        <Icon name="search" size={16} />
        <span className="sr-only">Search {look.label}</span>
        <input
          className="min-w-0 flex-1 bg-transparent text-[14px] text-primary-9 outline-none"
          value={search}
          placeholder={`Search ${look.label.toLowerCase()} by name…`}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>
      <ul className="scroll-thin flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto">
        {(results.data ?? []).map((entity) => {
          const on = picked.some((p) => p.id === entity.id);
          return (
            <li key={entity.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2 text-left hover:bg-fill-item-hover aria-pressed:bg-primary-0"
                aria-pressed={on}
                onClick={() => onToggle({ id: entity.id, name: entity.name, type })}
              >
                <span
                  className="grid size-8 flex-none place-items-center rounded-[10px]"
                  style={{ background: look.tint, color: look.colour }}
                >
                  <Icon name={on ? 'check' : type} size={16} stroke={2} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-primary-9">
                    {entity.name}
                  </span>
                  <span className="block truncate text-[12px] text-neutral-4">
                    {[entity.brain_region?.name, entity.created_by?.pref_label]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
        {results.isPending ? (
          <li className="px-3 py-2 text-[13px] text-neutral-4">Searching…</li>
        ) : null}
        {results.isError ? (
          <li className="px-3 py-2 text-[13px] text-destructive">
            The search failed: {reasonOf(results.error)}
          </li>
        ) : null}
        {results.isSuccess && results.data.length === 0 ? (
          <li className="px-3 py-2 text-[13px] text-neutral-4">Nothing matches.</li>
        ) : null}
      </ul>
    </div>
  );
}
