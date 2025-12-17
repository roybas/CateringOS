// ============================================================================
// WorkspaceRenderer - Parse event JSON and render to WORKSPACE
// Source: docs/_canon/module_2_3_tech_spec_v1_3_1.md
// Source: docs/_canon/module_2_3_ux_spec_v1_1_2.md
// ============================================================================

/**
 * Parses event JSON into ItemSource array.
 * Extracts from ingredients[] (has quantity+unit).
 * Maps stationId to stationName when available.
 * 
 * @param {Object} eventJson - The full event JSON
 * @returns {Array} Array of ItemSource objects
 */
function parseEventJson_(eventJson) {
  const ingredients = eventJson.ingredients || [];
  const stations = eventJson.stations || [];
  const eventInfo = eventJson.event || {};
  
  // Build station ID -> name map (normalize keys to String to avoid number/string mismatch)
  const stationMap = {};
  stations.forEach(station => {
    if (station.stationId && station.stationName) {
      stationMap[String(station.stationId)] = station.stationName;
    }
  });
  
  const eventName = eventInfo.eventName || 'אירוע ללא שם';
  
  // Parse each ingredient into ItemSource
  const itemSources = [];
  ingredients.forEach((ingredient, index) => {
    const stationId = ingredient.stationId;
    const stationName = stationMap[String(stationId)] || null; // null if missing, no guessing
    
    const itemNameRaw = ingredient.ingredientName || 'פריט ללא שם';
    
    // Preserve qty=0 (do not convert 0 to empty)
    // Only treat null/undefined as empty
    let qty = ingredient.quantity;
    if (qty === null || qty === undefined) {
      qty = '';
    } else {
      qty = String(qty); // Ensure string
    }
    
    const unit = ingredient.unit || '';
    
    // Generate deterministic sourceId (hash - no incremental IDs)
    const eventId = eventInfo.eventId;
    if (eventId === null || eventId === undefined || eventId === "") {
      throw new Error("חסר eventId ב-JSON של האירוע");
    }

    const ingredientId = ingredient.ingredientId;
    if (ingredientId === null || ingredientId === undefined || ingredientId === "") {
      throw new Error(`חסר ingredientId ב-ingredients (index ${index})`);
    }

    const sourceKey = `event:${eventId}|station:${stationId}|ingredient:${ingredientId}`;
    const sourceId = `src_${sha256Hex_(sourceKey).slice(0, 12)}`;
    
    itemSources.push({
      sourceId: sourceId,
      eventName: eventName,
      stationId: stationId,
      stationName: stationName,
      itemNameRaw: itemNameRaw,
      qty: qty,
      unit: unit
    });
  });
  
  return itemSources;
}

/**
 * Renders ItemSource array to WORKSPACE sheet (ephemeral rebuild).
 * Creates Parent/Child hierarchy with traceability.
 * Batch write only - no row-by-row operations.
 * 
 * @param {string} spreadsheetId - The spreadsheet ID
 * @param {string} workspaceSheetName - The workspace sheet name
 * @param {Array} itemSources - Array of ItemSource objects
 * @param {Object} eventInfo - Event metadata for display
 */
function renderWorkspace_(spreadsheetId, workspaceSheetName, itemSources, eventInfo) {
  const ss = SpreadsheetApp.openById(spreadsheetId);
  let workspace = ss.getSheetByName(workspaceSheetName);
  
  // Ensure workspace exists
  if (!workspace) {
    workspace = ss.insertSheet(workspaceSheetName);
  }
  
  // Clear existing content (ephemeral)
  workspace.clear();
  
  // Build rows
  const rows = buildWorkspaceRows_(itemSources, eventInfo);
  
  // Write all rows in one batch
  workspace.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  
  // Format header row (batch operation)
  workspace.getRange(1, 1, 1, rows[0].length)
    .setFontWeight('bold')
    .setBackground('#f3f3f3');
  
  // Apply conditional formatting for child rows (batch, no row-by-row loop)
  // Use formula-based conditional formatting on column B (Item Name)
  // Only apply if there are data rows (beyond header)
  if (rows.length > 1) {
    const dataRange = workspace.getRange(2, 2, rows.length - 1, 1); // Column B from row 2 onward
    
    // Create new rule: italic when column F (rowType) = "CHILD"
    const rule = SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$F2="CHILD"')
      .setFontStyle('italic')
      .setRanges([dataRange])
      .build();
    
    // WORKSPACE is ephemeral - set only this rule (no need to filter existing)
    workspace.setConditionalFormatRules([rule]);
  }
  
  // Hide the rowType column (column 6)
  workspace.hideColumns(6, 4);
  
  // Auto-resize columns
  workspace.autoResizeColumns(1, 5);
  
  Logger.log(`Rendered ${rows.length - 1} rows to WORKSPACE`);
}

/**
 * Builds workspace rows from ItemSource array.
 * Creates Parent (aggregated) and Child (source) rows.
 * 
 * @param {Array} itemSources - Array of ItemSource objects
 * @param {Object} eventInfo - Event metadata
 * @returns {Array} 2D array of row data
 */
function buildWorkspaceRows_(itemSources, eventInfo) {
  const rows = [];
  
  // Header row
  rows.push([
    'מצב',           // Status
    'שם פריט',       // Item Name
    'ספק',           // Supplier
    'סה"כ',          // Total
    'הקשר',          // Context (Event/Station)
    'rowType',       // Hidden - for formatting (must stay column 6 / F)
    'itemKey',       // Hidden - learning key
    'sourceId',      // Hidden - traceability key (for CHILD rows)
    'traceSourceIds' // Hidden - joined sourceIds (for PARENT rows)
  ]);
  
  if (itemSources.length === 0) {
    return rows;
  }
  
  // Group by itemNameRaw + unit (simple aggregation - no cross-event)
  // In V1, we only have one event per load, so grouping is straightforward
  const groups = {};
  
  itemSources.forEach(source => {
    const key = `${source.itemNameRaw}|${source.unit}`;
    if (!groups[key]) {
      groups[key] = {
        itemName: source.itemNameRaw,
        unit: source.unit,
        sources: []
      };
    }
    groups[key].sources.push(source);
  });
  
  // Sort group keys deterministically (by itemName, then unit)
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const [nameA, unitA] = a.split('|');
    const [nameB, unitB] = b.split('|');
    const nameCompare = nameA.localeCompare(nameB, 'he');
    if (nameCompare !== 0) return nameCompare;
    return unitA.localeCompare(unitB, 'he');
  });
  
  // Build Parent/Child rows for each group (in sorted order)
  sortedKeys.forEach(key => {
    const group = groups[key];
    
    // Calculate total qty (sum if all numeric, otherwise show first)
    // Preserve qty=0 (do not filter out zero values)
    let totalQty = '';
    const qtys = group.sources.map(s => s.qty).filter(q => q !== null && q !== undefined && q !== '');
    if (qtys.length > 0) {
      const allNumeric = qtys.every(q => !isNaN(parseFloat(q)));
      if (allNumeric) {
        const sum = qtys.reduce((acc, q) => acc + parseFloat(q), 0);
        totalQty = sum.toString();
      } else {
        totalQty = qtys[0]; // First value if not all numeric
      }
    }
    
    const totalDisplay = totalQty && group.unit ? `${totalQty} ${group.unit}` : totalQty;
    
    // Parent row
    const itemKey = `item_${sha256Hex_((group.itemName || '').trim() + '|' + (group.unit || '').trim()).slice(0, 12)}`;
    const traceSourceIds = group.sources.map(s => s.sourceId).join(',');

    rows.push([
      'Unclassified',              // Status (default per canon)
      group.itemName,              // Item name
      '',                          // Supplier (empty for now)
      totalDisplay,                // Total
      group.sources[0].eventName,  // Event context
      'PARENT',                    // Row type (hidden)
      itemKey,                     // itemKey (hidden)
      '',                          // sourceId empty on PARENT
      traceSourceIds               // traceSourceIds (hidden)
    ]);
    
    // Child rows (sources with traceability)
    group.sources.forEach(source => {
      const stationDisplay = source.stationName || `תחנה #${source.stationId}`;
      const qtyDisplay = source.qty && source.unit ? `${source.qty} ${source.unit}` : source.qty;
      
      rows.push([
        '',                          // Status (empty for child)
        `  ↳ ${stationDisplay}`,     // Indented station name
        '',                          // Supplier (empty)
        '',                          // Total (empty for child per canon)
        qtyDisplay,                  // Original qty in Context column
        'CHILD',                     // Row type (hidden)
        itemKey,                     // itemKey (hidden)
        source.sourceId,             // sourceId (hidden)
        ''                           // traceSourceIds empty on CHILD
      ]);
    });
  });
  
  return rows;
}



// --- Deterministic hashing helpers (Apps Script) ---
function sha256Hex_(input) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    input,
    Utilities.Charset.UTF_8
  );
  return bytes.map(b => ('0' + ((b & 0xff).toString(16))).slice(-2)).join('');
}
