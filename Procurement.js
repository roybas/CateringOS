function ping() {
  return "OK - Server Alive";
}

/**
 * Adds a menu entry for opening the Sidebar UI.
 * UI text is Hebrew RTL per canon.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('CateringOS')
    .addItem('פתח לוח רכש', 'showProcurementSidebar_')
    .addItem('פתח תצוגה רחבה', 'showProcurementDialog_')
    .addToUi();
}

/**
 * Opens the procurement sidebar.
 */
function showProcurementSidebar_() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('לוח רכש');
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Opens a modeless dialog for a wider workspace UI.
 * This is a usability workaround for the fixed sidebar width.
 */
function showProcurementDialog_() {
  const html = HtmlService.createHtmlOutputFromFile('ProcurementDialog')
    .setWidth(1100)
    .setHeight(720);
  SpreadsheetApp.getUi().showModelessDialog(html, 'לוח רכש — תצוגה רחבה');
}
