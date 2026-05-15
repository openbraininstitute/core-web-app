import {
  isWorkspaceManagerCreditsPanelKey,
  type TWorkspaceManagerCreditsPanel,
  type TWorkspaceManagerKind,
  WorkspaceManagerCreditsPanelDict,
  WorkspaceManagerKindDict,
  WorkspaceManagerSectionDict,
} from '@/ui/segments/workspaces/space-manager/constants';

/**
 * Mutable snapshot passed into navigation handlers from `WorkspaceManagerModal`.
 * Handlers read `activeSection` / `creditsPanel` for guards and call the setters to update UI state.
 *
 * @example
 * ```ts
 * const ctx: PanelTabNavigationContext = {
 *   kind: 'virtual-lab',
 *   activeSection: 'overview',
 *   creditsPanel: 'listing',
 *   setLocalSection,
 *   setCreditsPanel,
 *   setIsContentExpanded,
 * };
 * handleWorkspacePanelSectionSelect('members', ctx);
 * ```
 */
export type PanelTabNavigationContext = {
  activeSection: string;
  creditsPanel: TWorkspaceManagerCreditsPanel;
  kind: TWorkspaceManagerKind;
  setCreditsPanel: (value: TWorkspaceManagerCreditsPanel) => void;
  setIsContentExpanded: (value: boolean) => void;
  setLocalSection: (value: string | undefined) => void;
};

/**
 * Virtual Lab only: react to a **plain tab** (`Overview` / `Administrators`) from `PanelTabs`.
 * Does nothing if the user clicks the already-active section.
 * When leaving Credits for Overview or Members, resets `creditsPanel` to `listing` so the next
 * Credits visit starts from a predictable default.
 *
 * **Note:** The Credits **dropdown** tab never calls this; only menu items navigate into Credits
 * (see {@link handleWorkspacePanelMenuItemSelect}).
 *
 * @param sectionKey - Target section id, e.g. `WorkspaceManagerSectionDict.Overview`.
 * @param ctx - Current workspace manager state and setters.
 *
 * @example
 * ```ts
 * // User on Credits → Buy, then clicks "Administrators"
 * handleVirtualLabSectionSelect('members', ctx);
 * // → setCreditsPanel('listing'); setLocalSection('members');
 * ```
 */
function handleVirtualLabSectionSelect(sectionKey: string, ctx: PanelTabNavigationContext): void {
  if (sectionKey === ctx.activeSection) return;
  if (
    sectionKey === WorkspaceManagerSectionDict.Overview ||
    sectionKey === WorkspaceManagerSectionDict.Members
  ) {
    ctx.setCreditsPanel(WorkspaceManagerCreditsPanelDict.History);
  }
  ctx.setLocalSection(sectionKey);
}

/**
 * Handles **section tab** clicks from `PanelTabs` (`onSectionSelect`). Always collapses expanded
 * subscription-style content first, then applies kind-specific rules.
 *
 * - **Virtual lab:** delegates to {@link handleVirtualLabSectionSelect} (Overview / Members only
 *   from the tab row; Credits is dropdown-only).
 * - **Account / project:** switches section when different from `activeSection`.
 *
 * @param sectionKey - Section to navigate to (plain tab key).
 * @param ctx - Current modal tab state and setters.
 *
 * @example
 * ```ts
 * // Account: user switches Profile → Subscription
 * handleWorkspacePanelSectionSelect('subscription', {
 *   kind: 'account',
 *   activeSection: 'profile',
 *   creditsPanel: 'listing', // ignored for account
 *   setLocalSection,
 *   setCreditsPanel,
 *   setIsContentExpanded,
 * });
 * // → setIsContentExpanded(false); setLocalSection('subscription');
 * ```
 *
 * @example
 * ```ts
 * // Virtual lab: user on Credits, clicks Overview
 * handleWorkspacePanelSectionSelect('overview', {
 *   kind: 'virtual-lab',
 *   activeSection: 'credits',
 *   creditsPanel: 'buy',
 *   setLocalSection,
 *   setCreditsPanel,
 *   setIsContentExpanded,
 * });
 * // → setIsContentExpanded(false); setCreditsPanel('listing'); setLocalSection('overview');
 * ```
 */
export function handleWorkspacePanelSectionSelect(
  sectionKey: string,
  ctx: PanelTabNavigationContext
): void {
  ctx.setIsContentExpanded(false);

  if (ctx.kind === WorkspaceManagerKindDict.VirtualLab) {
    handleVirtualLabSectionSelect(sectionKey, ctx);
    return;
  }

  if (sectionKey === ctx.activeSection) return;
  ctx.setLocalSection(sectionKey);
}

/**
 * Applies a **Credits dropdown** row selection: validates `itemKey`, no-ops if already on that
 * credits sub-view, otherwise sets section to Credits and updates `creditsPanel`.
 *
 * @param itemKey - Credits panel key (`listing`, `buy`, `transfer`, `history`).
 * @param ctx - Current modal state and setters.
 * @returns `true` if state was updated (caller may collapse expanded content); `false` if no-op.
 *
 * @example
 * ```ts
 * // User on Overview opens Credits menu and chooses "Buy credits"
 * handleCreditsDropdownItem('buy', ctx);
 * // → setLocalSection('credits'); setCreditsPanel('buy'); return true;
 * ```
 *
 * @example
 * ```ts
 * // Already on Buy; user clicks "Buy credits" again
 * handleCreditsDropdownItem('buy', { ...ctx, activeSection: 'credits', creditsPanel: 'buy' });
 * // → return false (no duplicate navigation)
 * ```
 */
function handleCreditsDropdownItem(itemKey: string, ctx: PanelTabNavigationContext): boolean {
  if (!isWorkspaceManagerCreditsPanelKey(itemKey)) return false;
  if (ctx.activeSection === WorkspaceManagerSectionDict.Credits && ctx.creditsPanel === itemKey) {
    return false;
  }
  ctx.setLocalSection(WorkspaceManagerSectionDict.Credits);
  ctx.setCreditsPanel(itemKey);
  return true;
}

type TabMenuHandler = (itemKey: string, ctx: PanelTabNavigationContext) => boolean;

const TAB_MENU_ITEM_HANDLERS: Partial<Record<string, TabMenuHandler>> = {
  [WorkspaceManagerSectionDict.Credits]: handleCreditsDropdownItem,
};

/**
 * Handles **dropdown menu item** picks from `PanelTabs` (`onMenuItemSelect`). Looks up a handler
 * by parent tab `tabKey` (e.g. Credits tab → {@link handleCreditsDropdownItem}). Only runs for
 * virtual-lab kind today.
 *
 * If the handler reports a change (`true`), collapses expanded content via `setIsContentExpanded(false)`.
 * If the handler no-ops (`false`, e.g. same sub-panel), expanded state is left unchanged.
 *
 * To support another dropdown tab later, register `{ [tabKey]: (itemKey, ctx) => boolean }` in
 * `TAB_MENU_ITEM_HANDLERS` and implement the handler alongside Credits.
 *
 * @param args.tabKey - Parent tab id from `TabItem.key` (e.g. `'credits'`).
 * @param args.itemKey - Selected row id from `TabMenuItem.key` (e.g. `'buy'`).
 * @param ctx - Current modal state and setters.
 *
 * @example
 * ```ts
 * handleWorkspacePanelMenuItemSelect(
 *   { tabKey: 'credits', itemKey: 'history' },
 *   { kind: 'virtual-lab', activeSection: 'overview', creditsPanel: 'listing', ...setters }
 * );
 * // → Credits handler runs → setLocalSection('credits'); setCreditsPanel('history');
 * // → setIsContentExpanded(false);
 * ```
 *
 * @example
 * ```ts
 * // Account kind: no dropdown menu handlers — exits immediately
 * handleWorkspacePanelMenuItemSelect(
 *   { tabKey: 'credits', itemKey: 'buy' },
 *   { kind: 'account', ... }
 * );
 * // → no-op
 * ```
 */
export function handleWorkspacePanelMenuItemSelect(
  args: { itemKey: string; tabKey: string },
  ctx: PanelTabNavigationContext
): void {
  if (ctx.kind !== WorkspaceManagerKindDict.VirtualLab) return;
  const run = TAB_MENU_ITEM_HANDLERS[args.tabKey];
  if (!run) return;
  if (!run(args.itemKey, ctx)) return;
  ctx.setIsContentExpanded(false);
}
