// ============================================================================
// TABOOST CREATOR SYNC - Works exactly like Shop version
// Google Sheets → GitHub (exports raw CSV via GID)
// ============================================================================

// CONFIG - Your 3 sheets
const SHEET_CONFIG = [
  { tabName: 'Current', outputPath: 'data/current.csv' },
  { tabName: 'Rewards', outputPath: 'data/rewards-history.csv' },  // Dashboard expects this filename
  { tabName: 'History', outputPath: 'data/history.csv' }
];

// ============================================
// MAIN SYNC
// ============================================
function syncCreatorSheetsToGitHub() {
  const config = loadConfig();
  const startTime = new Date();
  const results = [];
  
  console.log(`🚀 Starting creator sync at ${startTime.toISOString()}`);
  
  for (const sheet of SHEET_CONFIG) {
    try {
      console.log(`📊 Processing: ${sheet.tabName}`);
      
      // Get GID for this sheet
      const gid = getGidForSheet(sheet.tabName);
      if (!gid) {
        throw new Error(`Sheet "${sheet.tabName}" not found`);
      }
      
      // Export raw CSV from Google
      const csvContent = exportSheetToCSV(config.SHEET_ID, gid);
      console.log(`✅ Exported ${csvContent.length} chars`);
      
      // DEBUG: Log first few lines to verify content
      if (sheet.tabName === 'Rewards') {
        const lines = csvContent.split('\n');
        console.log('📋 Rewards first 3 lines:');
        lines.slice(0, 3).forEach((line, i) => console.log(`  ${i + 1}: ${line.substring(0, 100)}`));
        
        // Find latest date in exported content
        const dateRegex = /(\d{1,2}\/\d{1,2}\/\d{4})/g;
        const dates = csvContent.match(dateRegex);
        if (dates) {
          console.log('📅 Latest dates in export:', dates.slice(0, 5).join(', '));
        }
      }
      
      // Push to GitHub
      const result = pushToGitHub(
        csvContent,
        config,
        sheet.outputPath,
        sheet.tabName
      );
      
      results.push({
        sheet: sheet.tabName,
        path: sheet.outputPath,
        status: 'success',
        commit: result.commit.sha.substring(0, 7)
      });
      
    } catch (error) {
      console.error(`❌ Failed ${sheet.tabName}:`, error.message);
      results.push({
        sheet: sheet.tabName,
        path: sheet.outputPath,
        status: 'error',
        error: error.message
      });
    }
  }
  
  const duration = (new Date() - startTime) / 1000;
  const successCount = results.filter(r => r.status === 'success').length;
  
  console.log(`✅ Done: ${successCount}/${SHEET_CONFIG.length} sheets in ${duration}s`);
  logResults(results, duration);
  
  return {
    success: successCount === SHEET_CONFIG.length,
    timestamp: new Date().toISOString(),
    duration: duration,
    results: results
  };
}

// Test
function testCreatorSync() {
  return syncCreatorSheetsToGitHub();
}

// ============================================
// EXPORT CSV (Raw from Google)
// ============================================
function exportSheetToCSV(sheetId, gid) {
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  
  const response = UrlFetchApp.fetch(exportUrl, {
    headers: {
      'Authorization': `Bearer ${ScriptApp.getOAuthToken()}`
    },
    muteHttpExceptions: true
  });
  
  if (response.getResponseCode() !== 200) {
    throw new Error(`Export failed: ${response.getContentText()}`);
  }
  
  return response.getContentText();
}

// ============================================
// GITHUB PUSH
// ============================================
function pushToGitHub(content, config, path, sheetName) {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = config;
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  
  // Check if file exists
  let sha = null;
  try {
    const check = UrlFetchApp.fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      muteHttpExceptions: true
    });
    if (check.getResponseCode() === 200) {
      sha = JSON.parse(check.getContentText()).sha;
    }
  } catch (e) {}
  
  // Upload
  const timestamp = new Date().toISOString();
  const payload = {
    message: `Auto-sync: ${sheetName} @ ${timestamp}`,
    content: Utilities.base64Encode(content),
    branch: 'master'
  };
  if (sha) payload.sha = sha;
  
  const upload = UrlFetchApp.fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  
  const code = upload.getResponseCode();
  if (code !== 200 && code !== 201) {
    throw new Error(`GitHub error ${code}: ${upload.getContentText()}`);
  }
  
  return JSON.parse(upload.getContentText());
}

// ============================================
// HELPERS
// ============================================
function getGidForSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  return sheet ? sheet.getSheetId().toString() : null;
}

function loadConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    GITHUB_TOKEN: props.getProperty('GITHUB_TOKEN'),
    GITHUB_OWNER: props.getProperty('GITHUB_OWNER') || 'ceyre-boop',
    GITHUB_REPO: props.getProperty('GITHUB_REPO') || 'TABOOST_Platfrom',
    SHEET_ID: props.getProperty('SHEET_ID')
  };
}

// ============================================
// SETUP
// ============================================
function setupCreatorSync() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();
  
  // GitHub Token
  const token = ui.prompt(
    'GitHub Token',
    'Enter GitHub Personal Access Token:',
    ui.ButtonSet.OK_CANCEL
  );
  if (token.getSelectedButton() !== ui.Button.OK) return;
  props.setProperty('GITHUB_TOKEN', token.getResponseText().trim());
  
  // Owner/Repo
  props.setProperty('GITHUB_OWNER', 'ceyre-boop');
  props.setProperty('GITHUB_REPO', 'TABOOST_Platfrom');
  
  // Sheet ID
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  props.setProperty('SHEET_ID', ss.getId());
  
  // Verify sheets exist
  const names = ss.getSheets().map(s => s.getName());
  const missing = SHEET_CONFIG.filter(cfg => !names.includes(cfg.tabName));
  
  if (missing.length > 0) {
    ui.alert('⚠️ Missing sheets: ' + missing.map(m => m.tabName).join(', '));
    return;
  }
  
  ui.alert('✅ Setup complete!\n\nWill sync:\n• Current → data/current.csv\n• Rewards → data/rewards-history.csv\n• History → data/history.csv\n\nRun testCreatorSync() to test.');
}

// ============================================
// TRIGGERS
// ============================================
function createHourlyTrigger() {
  deleteTriggers();
  ScriptApp.newTrigger('syncCreatorSheetsToGitHub')
    .timeBased()
    .everyHours(1)
    .create();
  SpreadsheetApp.getUi().alert('✅ Hourly sync enabled');
}

function createDailyTrigger() {
  deleteTriggers();
  // 10 AM Pacific Time (PT) = 18:00 UTC
  ScriptApp.newTrigger('syncCreatorSheetsToGitHub')
    .timeBased()
    .everyDays(1)
    .atHour(10)
    .nearMinute(0)
    .inTimezone('America/Los_Angeles')
    .create();
  SpreadsheetApp.getUi().alert('✅ Daily sync at 10:00 AM PT (California time) enabled');
}

// Alias for clarity
function setupDailyAutoSync() {
  return createDailyTrigger();
}

function deleteTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'syncCreatorSheetsToGitHub') {
      ScriptApp.deleteTrigger(t);
    }
  });
}

function stopSync() {
  deleteTriggers();
  SpreadsheetApp.getUi().alert('⏸️ Sync stopped');
}

// ============================================
// LOGGING
// ============================================
function logResults(results, duration) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let log = ss.getSheetByName('Sync Log');
    if (!log) {
      log = ss.insertSheet('Sync Log');
      log.appendRow(['Time', 'Duration', 'Sheet', 'Path', 'Status', 'Commit/Error']);
    }
    results.forEach(r => {
      log.appendRow([
        new Date().toISOString(),
        duration + 's',
        r.sheet,
        r.path,
        r.status,
        r.commit || r.error || ''
      ]);
    });
  } catch (e) {}
}

// ============================================
// MENU
// ============================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔄 CREATOR SYNC')
    .addItem('⚡ Sync Now', 'syncCreatorSheetsToGitHub')
    .addItem('🔧 First Time Setup', 'setupCreatorSync')
    .addSeparator()
    .addItem('⏰ Daily Auto-Sync (10 AM PT)', 'createDailyTrigger')
    .addItem('⏰ Hourly Auto-Sync', 'createHourlyTrigger')
    .addItem('⏸️ Stop Auto-Sync', 'stopSync')
    .addToUi();
}