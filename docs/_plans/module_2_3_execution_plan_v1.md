CateringOS - Module 2.3
CTO Execution Plan + Hand-off to Tech Lead
Component: Procurement UX Board (Table + Sidebar) Version: 1.0 (Build Plan aligned to canon) Date: 14/12/2025 Owner: Yoav (CTO) Canon Entry: docs/index.md Canon Docs:
	•	docs/_canon/module_2_3_tech_spec_v1_3_1.md
	•	docs/_canon/module_2_3_ux_spec_v1_1_2.md
	•	docs/_canon/runtime_targets_v1.md
	•	docs/_canon/workflow_prompt_integrity_protocol_v1.md Runtime Targets (locked): spreadsheetId + scriptId in runtime_targets_v1.md Workspace Sheet (locked): WORKSPACE Fixture (locked): examples/event_lior_niv.json

0) Non-negotiables
	•	Zero Guessing - no completing/assuming missing values. If ambiguous - keep separate rows.
	•	UI Table = display only. Every action/decision - Sidebar only.
	•	Copy = Commit + Snapshot.
	•	Dirty according to the explicit triggers in UX 1.1.2.
	•	Default for every new item: Unclassified.
	•	Traceability: every aggregation is traceable to Event + Station + original Qty.
	•	UI in Hebrew RTL, code/variables in English.
	•	WORKSPACE ephemeral - rebuild on every Reload, batch read/write only.
	•	Prompt Integrity - every execution prompt must have a fingerprint according to the protocol.

1) Strategy
We are not building a "system" and then connecting it. We are building a Vertical Slice that reaches M4 (Preview + Copy + Snapshot + Dirty) as fast as possible. M5 (Templates/Conversions/Cutoff) comes after the slice works end-to-end.

2) Definition of Ready
Before starting Milestone 1:
	•	Repo is synced to origin/main.
	•	runtime_targets_v1.md exists and is linked in docs/index.md.
	•	examples/event_lior_niv.json exists in the repo.
	•	clasp status is healthy (already locked per Yasmin).

3) Milestones (1-5) with work breakdown
Milestone 1 - Running skeleton: Menu + Sidebar Frame
Goal: GAS project runs, opens Sidebar from the menu, no business logic.
Touched files (minimum):
	•	Procurement.js (or src/main.js if a split already exists)
	•	appsscript.json
	•	ui/sidebar.html
	•	ui/sidebar.js
	•	docs/_canon/* do not modify
Data structures (minimum):
	•	AppConfig (reads targets from canon, no hardcode)
	•	UIState (mode, selectedRowId nullable)
DoD / Acceptance Criteria:
	•	There is a menu: CateringOS -> Open Procurement Board
	•	Clicking opens Sidebar with a Hebrew title + status "מוכן"
	•	There is a check that WORKSPACE exists, and if not - it is created
	•	There is no editing in the table (no onEdit flow, no UI that allows editing a cell)
Notes (performance):
	•	No row-by-row writing in loops at this stage at all.

Milestone 2 - Ingestion + Ephemeral Render to WORKSPACE

BEGIN PATCH (M2 - Identifiers)

Identifiers (M2 - must-have)

We must create and persist two deterministic identifiers. No incremental IDs.
	•	itemKey (learning key):
	•	Purpose: stable identity for “the same item” across weeks/events for saving decisions/learning.
	•	Used as the primary key in DB_DECISIONS.
	•	Must be deterministic (hash), not dependent on row order.
	•	sourceId (traceability key):
	•	Purpose: stable identity for a specific source row (for traceability drills).
	•	Derived deterministically from source context (Event + Station + original row context).
	•	Must be deterministic (hash), not dependent on row order.

Rules:
	•	No guessing. If we cannot deterministically compute a component, we keep it explicit and separate.
	•	Any change in menu order must NOT shift IDs of unrelated rows.

Acceptance impact:
	•	Renderer must output itemKey + sourceId into WORKSPACE alongside display fields, so decisions can be re-applied on rebuild.
END PATCH (M2 - Identifiers)


Goal: Reload Data loads the fixture JSON and renders a basic God View into WORKSPACE.
Touched files:
	•	services/drive_loader.js (or services/fixture_loader.js)
	•	services/workspace_renderer.js
	•	models/item_source.js
	•	models/workspace_row.js
	•	Procurement.js (menu: Reload)
Data structures (minimum workable):
	•	ItemSource:
	◦	eventName, stationName, itemNameRaw, qty, unit
	◦	sourceId (stable - deterministic hash only)
	•	WorkspaceRow:
	◦	rowId, rowType (PARENT/CHILD), displayItemName, displayQty, displayUnit
	◦	traceSourceIds[] (on Parent row)
	•	ParseResult:
	◦	mode (hierarchical/flat fallback)
	◦	itemSources[]
DoD / Acceptance Criteria:
	•	Menu Reload Data reads examples/event_lior_niv.json
	•	WORKSPACE is rebuilt (ephemeral) every run
	•	Parent/Child rows are displayed according to UX (Parent summarized within event, Child sources)
	•	Basic Traceability exists in the data (Parent knows which sourceIds compose it)
	•	Writing to the Sheet is done in batch (setValues), not appendRow in a loop
Edge handling:
	•	If the parser fails to detect hierarchy - fallback to a flat list (still renders, does not crash)

Milestone 3 - Sidebar Actions: Review Mode + Item Detail

BEGIN PATCH (M3 - Persistence + Sync)

Persistent decisions store (M3 - must-have)

WORKSPACE remains ephemeral (rebuilt on every Reload). Therefore, “learning/decisions” must be persisted outside WORKSPACE.

Create a dedicated persistent store:
	•	Google Sheet tab: DB_DECISIONS (canonical name)
	•	Purpose: store Shai’s explicit decisions so they survive Reload and menu changes.

DB_DECISIONS stores only learning/decisions (not event-specific quantities):
	•	classification: Prep / Buy (Raw/Ready)
	•	supplier default
	•	supplier spec default
	•	canonicalName + aliases mapping
	•	conversion rules (unit-to-unit ratios)
	•	supplier alias/terminology (how the supplier expects the item name)

Not stored here:
	•	event quantities per run
	•	Delivery Day selection per draft
	•	Order Note
	•	Snapshots of Copy (those belong to snapshot/log mechanism)

Read/write flow:
	•	On Reload: load entire DB_DECISIONS into memory first, then render WORKSPACE with decisions already applied.
	•	On any Sidebar action that changes decisions: write back to DB_DECISIONS (single source of truth).

Optimistic UI: Sync Status + Rollback (M3 - must-have)

If Sidebar updates UI immediately (optimistic), the UI must also expose sync truth:
	•	Sync state indicator: “שומר…” -> “נשמר”
	•	On save failure: rollback UI to previous state + show error in Hebrew.

This is required to prevent false confidence (Shai must never think a decision was saved when it wasn’t).
END PATCH (M3 - Persistence + Sync)


Goal: Make real decisions via Sidebar only and see them reflected in WORKSPACE.
Touched files:
	•	ui/sidebar.js (modes: Review, Item)
	•	services/actions_service.js (server endpoints)
	•	storage/state_store.js (minimal persistence for decisions)
	•	models/item_decision.js
	•	models/supplier.js
Data structures:
	•	ItemDecision:
	◦	classification (Unclassified/BuyRaw/BuyReady/Prep)
	◦	supplierId (nullable)
	◦	supplierSpec (nullable, but editing only here)
	•	Supplier:
	◦	supplierId, supplierName (initial list can be hardcoded temporarily if there is no canon for suppliers yet)
	•	ActionLog:
	◦	last action only (Undo scope)
DoD / Acceptance Criteria:
	•	Review Mode:
	◦	shows one Unclassified item at a time
	◦	choosing Prep -> auto-advance
	◦	choosing Buy -> must select supplier before Auto-Advance
	•	Item Detail:
	◦	changing classification/supplier/spec is done here only
	◦	Traceability is shown: Event + Station + original Qty
	•	Visual update:
	◦	after saving in the sidebar, tags/fields in WORKSPACE change immediately (at least after refresh/render, preferably immediately with optimistic UI)
No drift rule:
	•	There is no mode that allows direct editing in WORKSPACE.


BEGIN PATCH (M3 - DoD additions)
	•	Decisions persist across Reload via DB_DECISIONS (not WORKSPACE).
	•	Renderer applies persisted decisions on every rebuild.
	•	Sidebar shows sync status (“שומר…”/“נשמר”) and rolls back on failure.
END PATCH (M3 - DoD additions)


Milestone 4 - Drafts + Preview + Copy + Snapshot + Dirty + Undo(1)
Goal: Reach the truth point: Draft (Supplier+Day) -> Preview -> Copy -> Snapshot -> Dirty.
Touched files:
	•	models/order_draft.js
	•	services/draft_builder.js
	•	services/preview_builder.js
	•	services/snapshot_service.js
	•	storage/snapshots_index_store.js (dedicated Sheet tab, not WORKSPACE)
	•	ui/sidebar.js (Order mode + Preview)
Data structures:
	•	OrderDraft:
	◦	draftId, supplierId, deliveryDay (nullable), items[], status
	•	DraftItem:
	◦	canonicalName, qty, unit, supplierSpec
	◦	traceSourceIds[] (for internal transparency)
	•	DraftStatus:
	◦	MissingDeliveryDay, Draft, Copied, Dirty
	•	Snapshot (saved as JSON in Drive):
	◦	snapshotId, draftId, text, copiedAt, templateVersionId (nullable at this stage)
	◦	dirtyReasons[] (optional)
	•	DirtyState:
	◦	managed according to the triggers in UX 1.1.2
DoD / Acceptance Criteria:
	•	There is a Drafts list by supplier and then days
	•	Missing Delivery Day:
	◦	Copy is blocked until a day is selected
	•	Preview:
	◦	shows the text exactly as it will be copied (even if template is basic only)
	•	Copy:
	◦	saves Snapshot as a JSON file in Drive
	◦	writes a minimal index to a dedicated tab (not WORKSPACE)
	◦	Draft gets status Copied + timestamp
	•	Dirty:
	◦	any change in the defined triggers turns Dirty on and changes the button to "העתק מחדש"
	◦	if Missing Delivery Day still exists - it remains a block and is not "replaced" by Dirty
	•	Undo:
	◦	one action back in Sidebar only (per UX)

Milestone 5 - Templates Versioning + Conversions + Cutoff Warning
Goal: Complete V1 per spec: template per supplier with versions, conversions in order context, and cutoff as warning.
Touched files:
	•	models/template_version.js
	•	storage/templates_store.js
	•	models/conversion_rule.js
	•	storage/conversions_store.js
	•	models/cutoff_rule.js
	•	ui/sidebar.js (Template edit UI, Conversion flow UI)
	•	services/preview_builder.js (support for templateVersionId)
Data structures:
	•	TemplateVersion:
	◦	supplierId, versionId, content, createdAt
	•	ConversionRule:
	◦	itemKey (canonical key), fromUnit, toUnit, ratio
	•	CutoffRule:
	◦	supplierId, ruleText or structured fields - but warning only in UX
DoD / Acceptance Criteria:
	•	Template per supplier, every change creates a new version (immutable)
	•	Preview indicates "גרסת טמפלט: X"
	•	Supplier Spec is edited only in Item Detail (Order shows read-only)
	•	Conversions:
	◦	no automatic conversions
	◦	a short flow appears only when it blocks work/aggregation in Draft context
	•	Cutoff:
	◦	early warning in order screen, Copy is not blocked

4) Risks + Mitigations
	1	Sheets performance (large render)
	•	batch only, reduce heavy formatting, avoid many API calls.
	2	Sidebar-State drift
	•	optimistic UI + persist, and last-action log for Undo.
	3	Logs inflate
	•	Snapshot as JSON files in Drive, Sheet only as an index.
	4	RTL + mixed terminology
	•	UI strings in Hebrew only, English terms only when needed, early visual checks.
	5	Scope creep
	•	lock sequence: M1->M4 before any expansion. Every new idea goes to backlog, not code.

