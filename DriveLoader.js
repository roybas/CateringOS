// ============================================================================
// DriveLoader - Event JSON loading from Google Drive
// Source: docs/_canon/module_2_3_tech_spec_v1_3_1.md
// ============================================================================

/**
 * Gets the active event file to load.
 * If ACTIVE_EVENT_FILE_ID override exists, uses it.
 * Otherwise, lists files from folder and selects deterministically.
 * 
 * @param {string} folderId - The validated events folder ID
 * @param {string|null} activeEventFileId - Optional override file ID
 * @returns {Object} { fileId, fileName, extractedDate }
 * @throws {Error} If no valid files found or folder inaccessible
 */
function getActiveEventFile_(folderId, activeEventFileId) {
  // If override exists, use it
  if (activeEventFileId) {
    try {
      const file = DriveApp.getFileById(activeEventFileId);
      const fileName = file.getName();
      const extractedDate = extractDateFromFileName_(fileName);
      
      return {
        fileId: activeEventFileId,
        fileName: fileName,
        extractedDate: extractedDate // may be null if name doesn't match
      };
    } catch (error) {
      throw new Error(
        `לא ניתן לטעון קובץ אירוע (ACTIVE_EVENT_FILE_ID):\n${activeEventFileId}\n\nשגיאה: ${error.message}`
      );
    }
  }
  
  // No override - list and select
  const validFiles = listValidEventFiles_(folderId);
  
  if (validFiles.length === 0) {
    throw new Error(
      `לא נמצאו קבצי אירועים תקפים בתיקייה.\n\n` +
      `פורמט שם קובץ נדרש:\n` +
      `event_YYYY-MM-DD_<slug>.json\n\n` +
      `תיקייה: ${folderId}`
    );
  }
  
  return selectEventFile_(validFiles);
}

/**
 * Lists all valid event JSON files from the folder.
 * Validates file names against strict regex.
 * 
 * @param {string} folderId - The folder ID
 * @returns {Array} Array of { fileId, fileName, extractedDate }
 * @throws {Error} If folder is inaccessible
 */
function listValidEventFiles_(folderId) {
  let folder;
  try {
    folder = DriveApp.getFolderById(folderId);
  } catch (error) {
    throw new Error(
      `לא ניתן לגשת לתיקיית אירועים:\n${folderId}\n\nודא שהתיקייה קיימת ויש הרשאות גישה.`
    );
  }
  
  // Get all files (not filtered by MIME type - JSON files may not be detected correctly)
  const files = folder.getFiles();
  const validFiles = [];
  
  // Strict regex: ^event_(\d{4}-\d{2}-\d{2})_(.+)\.json$
  // Slug can be ANY non-empty string (Hebrew, spaces, hyphens, underscores, etc.)
  const fileNameRegex = /^event_(\d{4}-\d{2}-\d{2})_(.+)\.json$/;
  
  while (files.hasNext()) {
    const file = files.next();
    const fileName = file.getName();
    
    // Validate ONLY by file name (strict on prefix+date+suffix)
    const match = fileName.match(fileNameRegex);
    if (match) {
      const dateStr = match[1]; // YYYY-MM-DD
      const slug = match[2];
      
      // Validate slug is non-empty (regex already ensures .+ but double-check)
      if (slug && slug.trim().length > 0) {
        validFiles.push({
          fileId: file.getId(),
          fileName: fileName,
          extractedDate: dateStr
        });
      }
    }
  }
  
  return validFiles;
}

/**
 * Selects which event file to load based on date logic.
 * "Next upcoming" = min date >= today (date-only comparison, Asia/Jerusalem)
 * If no future events, choose "latest past" = max date.
 * 
 * @param {Array} validFiles - Array of { fileId, fileName, extractedDate }
 * @returns {Object} Selected file { fileId, fileName, extractedDate }
 */
function selectEventFile_(validFiles) {
  // Get today's date in YYYY-MM-DD format (Asia/Jerusalem timezone)
  const todayYmd = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd');
  
  // Split into future and past
  const futureFiles = validFiles.filter(f => f.extractedDate >= todayYmd);
  const pastFiles = validFiles.filter(f => f.extractedDate < todayYmd);
  
  // Sort future ascending (earliest first)
  futureFiles.sort((a, b) => a.extractedDate.localeCompare(b.extractedDate));
  
  // Sort past descending (latest first)
  pastFiles.sort((a, b) => b.extractedDate.localeCompare(a.extractedDate));
  
  // Choose next upcoming, or if none, latest past
  if (futureFiles.length > 0) {
    return futureFiles[0];
  } else if (pastFiles.length > 0) {
    return pastFiles[0];
  } else {
    // Should not happen if validFiles is non-empty, but safety
    return validFiles[0];
  }
}

/**
 * Extracts date from file name if it matches the pattern.
 * Returns null if no match (but doesn't throw - allows override files with any name).
 * 
 * @param {string} fileName - The file name
 * @returns {string|null} Date string YYYY-MM-DD or null
 */
function extractDateFromFileName_(fileName) {
  const fileNameRegex = /^event_(\d{4}-\d{2}-\d{2})_(.+)\.json$/;
  const match = fileName.match(fileNameRegex);
  return match ? match[1] : null;
}

/**
 * Loads and parses JSON from a Drive file by ID.
 * 
 * @param {string} fileId - The file ID
 * @returns {Object} Parsed JSON object
 * @throws {Error} If file cannot be read or JSON is invalid
 */
function loadEventJson_(fileId) {
  let fileName = 'לא ידוע';
  try {
    const file = DriveApp.getFileById(fileId);
    fileName = file.getName();
    const content = file.getBlob().getDataAsString('UTF-8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(
      `שגיאה בטעינת קובץ JSON:\nfileName: ${fileName}\nfileId: ${fileId}\n\n${error.message}`
    );
  }
}

