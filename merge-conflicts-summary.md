# Merge Conflicts Summary: develop → task/v2

**Date:** August 30, 2025  
**Branches:** `develop` → `task/v2`  
**Total Conflicted Files:** 67

## Overview

The merge between the `develop` and `task/v2` branches has **67 files with conflicts**. This indicates extensive parallel development with significant architectural changes in both branches.

## Conflict Breakdown by Category

### 📦 Configuration & Dependencies (3 files)

- ❌ `next.config.ts`
- ❌ `package.json`
- ❌ `pnpm-lock.yaml`

### 🔌 API Layer (3 files)

- ✅ `src/api/entitycore/queries/assets/index.ts` _(auto-merged)_
- ✅ `src/api/entitycore/types/shared/global.ts` _(auto-merged)_
- ❌ `src/api/entitycore/types/shared/response.ts` **CONFLICT**

### 🤖 AI Assistant Components (5 files)

All have conflicts:

- ❌ `src/components/ai-assistant/ai-assistant.module.css` **CONFLICT**
- ❌ `src/components/ai-assistant/ai-assistant.tsx` **CONFLICT**
- ❌ `src/components/ai-assistant/hooks.tsx` **CONFLICT** _(add/add)_
- ❌ `src/components/ai-assistant/message-item/message-item.tsx` **CONFLICT**
- ❌ `src/components/ai-assistant/panel-splitter/panel-splitter.tsx` **CONFLICT**

### 🎨 UI Components (6 files)

- ❌ `src/components/explore-section/ExploreInteractive/index.tsx` **CONFLICT**
- ✅ `src/components/explore-section/ExploreSectionListingView/ExploreSectionTable.tsx` _(auto-merged)_
- ✅ `src/components/explore-section/ExploreSectionListingView/FilterControls.tsx` _(auto-merged)_
- ✅ `src/components/explore-section/ExploreSectionListingView/hooks.tsx` _(auto-merged)_
- ✅ `src/components/explore-section/ExploreSectionListingView/index.tsx` _(auto-merged)_
- ✅ `src/components/explore-section/ExploreSectionListingView/useRowSelection.ts` _(auto-merged)_
- ❌ `src/components/github-flavor-markdown/github-flavor-markdown.tsx` **CONFLICT**
- ❌ `src/components/icons/EditorIcons.tsx` **CONFLICT**
- ❌ `src/components/neuron-viewer/index.tsx` **CONFLICT**
- ❌ `src/components/neuron-viewer/plugins/InjectionRecordingPopover.tsx` **CONFLICT**
- ✅ `src/config.ts` _(auto-merged)_

### ⚙️ Entity Configuration Layer (20+ files)

#### Field Definitions

- ❌ `src/entity-configuration/definitions/fields-defs/common.tsx` **CONFLICT**
- ✅ `src/entity-configuration/definitions/fields-defs/model.tsx` _(auto-merged)_
- ❌ `src/entity-configuration/definitions/renderer.tsx` **CONFLICT**
- ✅ `src/entity-configuration/definitions/types.ts` _(auto-merged)_
- ❌ `src/entity-configuration/definitions/view-defs/model.ts` **CONFLICT**

#### Domain Models - Experimental

- ❌ `src/entity-configuration/domain/experimental/bouton-density.ts` **CONFLICT**
- ❌ `src/entity-configuration/domain/experimental/electrical-cell-recording.ts` **CONFLICT**
- ❌ `src/entity-configuration/domain/experimental/neuron-density.ts` **CONFLICT**
- ❌ `src/entity-configuration/domain/experimental/reconstruction-morphology.ts` **CONFLICT**
- ❌ `src/entity-configuration/domain/experimental/synapse-per-connection.ts` **CONFLICT**

#### Domain Models - Core

- ❌ `src/entity-configuration/domain/helpers.ts` **CONFLICT**
- ✅ `src/entity-configuration/domain/index.ts` _(auto-merged)_
- ❌ `src/entity-configuration/domain/types.ts` **CONFLICT**

#### Domain Models - Model Types

- ❌ `src/entity-configuration/domain/model/circuit.ts` **CONFLICT**
- ❌ `src/entity-configuration/domain/model/e-model.ts` **CONFLICT**
- ✅ `src/entity-configuration/domain/model/index.ts` _(auto-merged)_
- ❌ `src/entity-configuration/domain/model/me-model.ts` **CONFLICT**
- ❌ `src/entity-configuration/domain/model/mirocircuit.ts` **CONFLICT**
- ❌ `src/entity-configuration/domain/model/paired-neurons.ts` **CONFLICT**
- ❌ `src/entity-configuration/domain/model/single-neuron-synaptome.ts` **CONFLICT**
- ❌ `src/entity-configuration/domain/model/small-microcircuit.ts` **CONFLICT**

#### Domain Models - Simulations

- ❌ `src/entity-configuration/domain/simulation/paired-neurons-simulation.ts` **CONFLICT**
- ❌ `src/entity-configuration/domain/simulation/simulation-campaign.ts` **CONFLICT**
- ❌ `src/entity-configuration/domain/simulation/single-neuron-simulation.ts` **CONFLICT**
- ❌ `src/entity-configuration/domain/simulation/single-neuron-synaptome-simulation.ts` **CONFLICT**
- ❌ `src/entity-configuration/domain/simulation/small-microcircuit-simulation.ts` **CONFLICT**

### 🔧 Features & Views (15+ files)

#### Core Features

- ❌ `src/features/bookmark/control.tsx` **CONFLICT**
- ✅ `src/features/bookmark/listing-table.tsx` _(auto-merged)_
- ❌ `src/features/brain-atlas-viewer/index.tsx` **CONFLICT**
- ❌ `src/features/cell-composition/elements/m-e-type-tree.tsx` **CONFLICT**

#### Details & Summary Views

- ✅ `src/features/details-view/overview.tsx` _(auto-merged)_
- ❌ `src/features/details-view/summary.tsx` **CONFLICT**

#### Entity-Specific Views

- ✅ `src/features/entities/e-model/detail-view/index.tsx` _(auto-merged)_
- ✅ `src/features/entities/e-model/listing-view.tsx` _(auto-merged)_
- ❌ `src/features/entities/me-model/detail-view/index.tsx` **CONFLICT**
- ❌ `src/features/entities/neuron-simulation/elements/me-model-details.tsx` **CONFLICT**
- ❌ `src/features/entities/neuron-simulation/elements/synaptome-details.tsx` **CONFLICT**
- ✅ `src/features/entities/neuron-simulation/experiment/elements/popover.tsx` _(auto-merged)_
- ✅ `src/features/entities/neuron-simulation/experiment/steps-wizard/recording.tsx` _(auto-merged)_
- ✅ `src/features/entities/single-neuron-synaptome/build/phases/me-model-listing.tsx` _(auto-merged)_
- ❌ `src/features/entities/single-neuron-synaptome/detail-view/index.tsx` **CONFLICT**

#### File Handling & Downloads

- ⚠️ `src/features/entity-download/file-handlers.ts` **MODIFY/DELETE CONFLICT** _(deleted in develop, modified in task/v2)_
- ✅ `src/features/entity-download/utils.ts` _(auto-merged)_

#### Listing & Filters

- ❌ `src/features/listing-filter-panel/listing-filter-panel.tsx` **CONFLICT**
- ✅ `src/features/small-microcircuit/index.tsx` _(auto-merged)_
- ✅ `src/features/thumbnail/preview.tsx` _(auto-merged)_
- ❌ `src/features/views/details/model.tsx` **CONFLICT**
- ✅ `src/features/views/listing/index.tsx` _(auto-merged)_
- ❌ `src/features/views/listing/model-listing-view.tsx` **CONFLICT**

### 🔄 Query Providers (2 files)

Both have add/add conflicts:

- ❌ `src/query-provider/client.tsx` **CONFLICT** _(add/add)_
- ❌ `src/query-provider/query-client.tsx` **CONFLICT** _(add/add)_

### 🛠️ Services & State Management (5 files)

- ❌ `src/services/ai-agent/assistant/assistant.ts` **CONFLICT**
- ❌ `src/services/entitycore/entities-count.ts` **CONFLICT**
- ✅ `src/state/explore-section/column-key-to-filter.ts` _(auto-merged)_
- ❌ `src/state/explore-section/list-view-atoms.ts` **CONFLICT**

### 🎯 Hooks & Utilities (3 files)

- ❌ `src/hooks/useExploreColumns.tsx` **CONFLICT**
- ✅ `src/styles/globals.css` _(auto-merged)_
- ✅ `src/utils/type.ts` _(auto-merged)_
- ✅ `src/utils/url-builder.ts` _(auto-merged)_

## Key Observations

### 🏗️ Major Architectural Changes

The conflicts suggest significant refactoring in both branches, particularly around:

- **Entity type systems**: Likely moving from enum-based to dictionary-based patterns
- **AI assistant implementation**: Complete rewrite or major feature additions
- **Query provider structure**: New query client architecture
- **Component architectures**: Structural changes in UI components

### 📊 Conflict Statistics

- **Total Files Changed**: 67
- **Files with Conflicts**: 42
- **Auto-merged Files**: 25
- **Special Cases**: 1 (modify/delete conflict)

### 🎯 Critical Areas Affected

1. **Type definitions and entity configurations**
2. **UI components and user interactions**
3. **API layer and data fetching**
4. **State management patterns**
5. **AI assistant functionality**

## Resolution Strategy

### 🚨 High Priority

1. **Configuration files** - Resolve dependency conflicts first
2. **Type system changes** - Entity type refactoring needs careful alignment
3. **Query providers** - Critical for data fetching architecture

### ⚡ Medium Priority

1. **AI assistant components** - Feature-specific conflicts
2. **Entity configuration domain** - Business logic alignment
3. **UI component updates** - User experience consistency

### 📝 Low Priority

1. **Styling and CSS** - Visual inconsistencies
2. **Utility functions** - Helper method updates

## Recommendations

### 🔄 Process

1. **Team Coordination**: Coordinate between teams that worked on both branches
2. **Incremental Resolution**: Resolve conflicts in logical groups (types → API → UI → features)
3. **Thorough Testing**: Each resolved conflict group should be tested before proceeding
4. **Documentation**: Update documentation for any architectural changes

### 🛡️ Risk Mitigation

1. **Backup Strategy**: Create backup branches before resolution
2. **Automated Testing**: Run full test suite after each major conflict resolution
3. **Code Review**: Have multiple reviewers for complex conflict resolutions
4. **Staged Deployment**: Deploy changes incrementally to catch integration issues

---

**Generated on:** August 30, 2025  
**Repository:** `/Users/mebilal/Desktop/workspace/obi/core-web-app`
