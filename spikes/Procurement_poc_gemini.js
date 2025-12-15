// ==========================================
// הגדרות גלובליות (Global Configuration)
// ==========================================
var LIBRARY_FOLDER_ID = "1lHD_KgM-r42WeFC_HdKt6xjhS6LdC0wv";

// ==========================================
// מודול ראשי: תזמור התהליך (Main Orchestrator)
// ==========================================
function main() {
  // --- הגדרות ---
  var fileName = "event_lior_niv.json"; // ודא שזה השם המדויק בדרייב שלך

  Logger.log("🚀 מתחיל תהליך רכש עבור: " + fileName);

  // 1. קריאת הקובץ
  var rawData = readJsonFromDrive(fileName);
  if (!rawData) return; // עוצרים אם הייתה שגיאה בקריאה

  // 2. עיבוד הנתונים (המוח)
  var shoppingList = aggregateIngredients(rawData);

  // 3. הצגת נתונים ללוג (בדיקה ספציפית לבצל)
  debugSpecificItem(shoppingList, "בצל צרוב");

  // 4. כתיבה לגיליון
  writeToSheet(shoppingList);
  
  Logger.log("🏁 התהליך הסתיים בהצלחה.");
}

// ==========================================
// מודול 1: קריאה מהדרייב (The Reader)
// ==========================================
function readJsonFromDrive(fileName) {
  var files = DriveApp.getFilesByName(fileName);
  
  if (!files.hasNext()) {
    Logger.log("❌ שגיאה: הקובץ '" + fileName + "' לא נמצא בתיקייה.");
    return null;
  }

  var file = files.next();
  try {
    var content = file.getBlob().getDataAsString();
    var json = JSON.parse(content);
    Logger.log("✅ הקובץ נקרא ופוענח בהצלחה.");
    return json;
  } catch (e) {
    Logger.log("❌ שגיאה בפענוח ה-JSON: " + e.message);
    return null;
  }
}

// ==========================================
// מודול 2: המוח הלוגי (Aggregation Logic)
// ==========================================
function aggregateIngredients(jsonData) {
  var stationMap = {};
  
  // מיפוי תחנות (בצורה בטוחה - לא קורס אם אין תחנות)
  if (jsonData.stations && Array.isArray(jsonData.stations)) {
    jsonData.stations.forEach(function(s) {
      stationMap[s.stationId] = s.stationName;
    });
  }

  // זיהוי רשימת המרכיבים (תמיכה במבנים שונים)
  var ingredientsList = [];
  if (jsonData.ingredients && Array.isArray(jsonData.ingredients)) {
    ingredientsList = jsonData.ingredients; // המבנה האידיאלי
  } else if (Array.isArray(jsonData)) {
    ingredientsList = jsonData; // גיבוי: אם הקובץ הוא רק רשימה
  }

  if (ingredientsList.length === 0) {
    Logger.log("⚠️ לא נמצאו מרכיבים לעיבוד.");
    return [];
  }

  var aggregated = {};

  ingredientsList.forEach(function(ing) {
    // נרמול נתונים
    var name = ing.ingredientName ? ing.ingredientName.trim() : "ללא שם";
    var unit = ing.unit ? ing.unit.trim() : "יח";
    var qty = parseFloat(ing.quantity) || 0;
    
    // מפתח ייחודי: שם + יחידה (כדי לא לחבר ק"ג עם ליטר)
    var key = name + "_" + unit;

    // יצירת רשומה חדשה אם לא קיימת
    if (!aggregated[key]) {
      aggregated[key] = {
        name: name,
        unit: unit,
        totalQuantity: 0,
        sources: [] 
      };
    }

    // סכימה
    aggregated[key].totalQuantity += qty;

    // ניהול המקורות (מאיפה זה הגיע וכמה)
    var stationName = stationMap[ing.stationId] || "כללי";
    var existingSource = aggregated[key].sources.find(s => s.name === stationName);
    
    if (existingSource) {
      existingSource.quantity += qty;
    } else {
      aggregated[key].sources.push({
        name: stationName,
        quantity: qty
      });
    }
  });

  // המרה לרשימה והחזרה
  var resultList = Object.values(aggregated);
  Logger.log("✅ אגרגציה הושלמה: נוצרו " + resultList.length + " פריטים ייחודיים.");
  return resultList;
}

// ==========================================
// מודול 3: הצייר (Renderer)
// ==========================================
function writeToSheet(shoppingList) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Sheet1");
  if (!sheet) sheet = ss.getSheets()[0];

  sheet.clear();
  
  // כותרות עם עמודת "עמדה" חדשה
  var table = [["שם הפריט", "כמות", "יחידה", "עמדה", "להכנה?"]];
  var parentRows = [];

  shoppingList.forEach(function(item) {
    var stationDisplay;
    var createChildren = false;
    
    // בדיקה: כמה מקורות יש?
    if (item.sources.length === 1) {
      // מקור יחיד - נציג אותו ישירות בעמודה
      stationDisplay = item.sources[0].name;
      createChildren = false;
    } else {
      // מספר מקורות - נפרט בשורות ילדים
      stationDisplay = "מרוכז";
      createChildren = true;
    }
    
    // שורת האב
    table.push([item.name, item.totalQuantity, item.unit, stationDisplay, false]);
    parentRows.push(table.length); // שומרים אינדקס להדגשה

    // שורות הבנים (רק אם יש יותר ממקור אחד)
    if (createChildren) {
      item.sources.forEach(function(src) {
        var detail = "     ↳ " + src.name + " (" + src.quantity + ")";
        table.push([detail, "", "", "", ""]);
      });
    }
  });

  if (table.length > 0) {
    sheet.getRange(1, 1, table.length, table[0].length).setValues(table);
    
    // עיצוב
    sheet.setRightToLeft(true);
    sheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#e0e0e0");
    parentRows.forEach(rowIndex => {
      sheet.getRange(rowIndex, 1, 1, 5).setFontWeight("bold").setBackground("#f9f9f9");
    });
  }
}

// ==========================================
// כלי עזר: בדיקה ספציפית לפריט (Debug)
// ==========================================
function debugSpecificItem(list, itemName) {
  Logger.log("------------------------------------------------");
  Logger.log("🔍 תחקיר עבור הפריט: '" + itemName + "'");
  
  var found = list.filter(i => i.name.includes(itemName));
  
  if (found.length === 0) {
    Logger.log("❌ לא נמצאו פריטים בשם זה.");
  } else {
    found.forEach(function(item) {
      Logger.log("📦 מופע נמצא: " + item.totalQuantity + " " + item.unit);
      Logger.log("   מקורות: " + JSON.stringify(item.sources));
    });
  }
  Logger.log("------------------------------------------------");
}