// ============================================================================
// TABOOST BULLETPROOF SYNC v2 - Sheets → CSV + data.js → GitHub
// ============================================================================
// Exports: Current, Rewards, Current-UK sheets
// Generates: data.js (clean, no #N/A)
// Pushes: All files to GitHub
// ============================================================================

const SYNC_CONFIG = {
  sheets: [
    { name: 'Current', csvPath: 'data/current.csv' },
    { name: 'Rewards', csvPath: 'data/rewards.csv' },
    { name: 'Current-UK', csvPath: 'data/current-uk.csv' }
  ],
  dataJsPath: 'js/data.js',
  github: {
    owner: 'ceyre-boop',
    repo: 'TABOOST_Platfrom',
    branch: 'main'
  }
};

// ============================================
// DATA CLEANING
// ============================================
function cleanValue(val, type = 'string', defaultVal = '') {
  if (val === null || val === undefined) return defaultVal;
  const strVal = String(val).trim();
  if (strVal === '#N/A' || strVal === '#VALUE!' || strVal === '#REF!' || 
      strVal === '#DIV/0!' || strVal === '#NUM!' || strVal === '#NAME?' ||
      strVal === '#NULL!' || strVal === '#ERROR!') {
    return defaultVal;
  }
  if (type === 'int') {
    const cleaned = strVal.replace(/,/g, '').replace(/"/g, '');
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? (defaultVal || 0) : num;
  }
  if (type === 'number') {
    const cleaned = strVal.replace(/,/g, '').replace(/"/g, '').replace(/\$/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? (defaultVal || 0) : num;
  }
  return strVal || defaultVal;
}

// ============================================
// EXPORT & CLEAN SHEET
// ============================================
function exportCleanSheet(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) throw new Error(`Sheet "${sheet.getName()}" has no data`);
  
  const headers = data[0].map(h => String(h).trim());
  const rows = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const cleanRow = {};
    
    headers.forEach((header, idx) => {
      const hLower = header.toLowerCase();
      let type = 'string';
      let defaultVal = '';
      
      if (hLower.includes('diamond') || hLower.includes('💎') ||
          hLower.includes('hours') || hLower.includes('days') ||
          hLower.includes('score') || hLower.includes('tier') ||
          hLower.includes('level') || hLower.includes('month') ||
          hLower.includes('earned') || hLower.includes('gifted') ||
          hLower.includes('id') || hLower === 'host') {
        type = 'int';
        defaultVal = 0;
      }
      
      if (hLower.includes('manager') || hLower === 'agent' || hLower === 'm') {
        defaultVal = 'Unassigned';
      }
      if (hLower.includes('status')) defaultVal = 'GO';
      if (hLower.includes('multiply')) defaultVal = '-';
      if (hLower.includes('bonus')) defaultVal = '$0.00';
      
      cleanRow[header] = cleanValue(row[idx], type, defaultVal);
    });
    
    // Skip rows without identifier
    const hasId = headers.some((h, idx) => {
      const hl = h.toLowerCase();
      return (hl.includes('username') || hl.includes('name') || 
              hl === 'host' || hl === 'id') && data[i][idx];
    });
    
    if (hasId) rows.push(cleanRow);
  }
  
  return { headers, rows };
}

// ============================================
// GENERATE data.js CONTENT
// ============================================
function generateDataJS(sheetData, sheetName) {
  const timestamp = new Date().toISOString();
  
  // Map to expected creator structure
  const creators = sheetData.rows.map((row, index) => {
    const h = sheetData.headers;
    const get = (name) => {
      const idx = h.findIndex(header => 
        header.toLowerCase().includes(name.toLowerCase())
      );
      return idx >= 0 ? row[h[idx]] : '';
    };
    
    // Find manager value
    let manager = get('agent') || get('manager') || 'Unassigned';
    if (manager.includes('+')) manager = manager.split('+')[0].trim();
    
    return {
      id: index + 1,
      creatorId: get('host') || get('creator id') || '',
      username: (get('username') || get('tiktok') || '').toLowerCase(),
      name: get('username') || get('tiktok') || '',
      email: (get('username') || get('tiktok') || '').toLowerCase() + '@taboost.me',
      status: get('status') || 'GO',
      level: String(get('level') || '0'),
      month: String(get('month') || ''),
      manager: manager.toUpperCase(),
      m: manager.toUpperCase(),
      claimed: false,
      score: parseInt(get('score')) || 0,
      diamonds: parseInt(get('diamonds') || get('💎')) || 0,
      diamondsPace: String(get('pace') || '0'),
      diamondsGoal: parseInt(get('diamond goal')) || 0,
      diamondsLast30: parseInt(get('last 30') || get('diamonds last 30')) || 0,
      diamondsLastMonth: parseInt(get('last month') || get('-1 month')) || 0,
      diamonds2MonthsAgo: parseInt(get('2 months') || get('-2 month')) || 0,
      hours: parseInt(get('hours')) || 0,
      hoursGoal: parseInt(get('hours goal') || get('hrs goal')) || 0,
      hoursLeft: String(get('hours left') || get('hrs left') || '0'),
      validLiveDays: parseInt(get('days') || get('live days')) || 0,
      daysGoal: parseInt(get('days goal')) || 0,
      daysLeft: String(get('days left') || '0'),
      tier: parseInt(get('tier')) || 0,
      tierGoal: parseInt(get('tier goal')) || 0,
      tierLeft: String(get('tier left') || '0'),
      tierStatus: get('tier status') || '-',
      tierLastMonth: get('tier last month') || '-',
      growthPercent: 0,
      earned: parseInt(get('earned')) || 0,
      gifted: parseInt(get('gifted')) || 0,
      running: String(get('running') || '0'),
      multiply: get('multiply') || '-',
      unlocked: String(get('unlocked') || '0'),
      estRev: parseInt(get('est rev') || get('revenue')) || 0,
      bonus: get('bonus') || '$0.00',
      daysMonth: parseInt(get('days month')) || 0,
      hoursMonth: parseInt(get('hours month')) || 0,
      rewardsMonth: String(get('rewards') || get('rewards month') || '0')
    };
  }).filter(c => c.username); // Only keep rows with usernames
  
  // Build data.js content
  return `// Taboost Agency - Complete Creator Data
// Generated: ${timestamp}
// Total: ${creators.length} creators
// Source: ${sheetName} sheet (cleaned)

const creatorsData = ${JSON.stringify(creators, null, 2)};

const taboostData = {
  creators: creatorsData,
  lastUpdated: "${timestamp}",
  getAllCreators: function() { return this.creators; },
  getCreator: function(username) { 
    return this.creators.find(c => c.username === username.toLowerCase()); 
  },
  loadFromCSV: async function() { return this.creators; }
};`;
}

// ============================================
// CSV CONVERSION
// ============================================
function toCSV(headers, rows) {
  const lines = [headers.join(',')];
  rows.forEach(row => {
    const values = headers.map(h => {
      let val = row[h];
      if (val === null || val === undefined) return '';
      val = String(val);
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        val = '"' + val.replace(/"/g, '""') + '"';
      }
      return val;
    });
    lines.push(values.join(','));
  });
  return lines.join('\n');
}

// ============================================
// GITHUB PUSH
// ============================================
function pushToGitHub(content, path, message, config) {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = config;
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  
  // Check for existing file
  let sha = null;
  try {
    const res = UrlFetchApp.fetch(apiUrl, {
      method: 'GET',
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'Accept': 'application/vnd.github.v3+json' },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() === 200) sha = JSON.parse(res.getContentText()).sha;
  } catch (e) {}
  
  // Upload
  const payload = { message, content: Utilities.base64Encode(content), branch: 'main' };
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
// MAIN SYNC
// ============================================
function syncAllToGitHub() {
  const config = loadConfig();
  const startTime = new Date();
  const results = [];
  
  console.log(`🚀 Starting full sync at ${startTime.toISOString()}`);
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Use first sheet (Current) as source for data.js
    const primarySheet = ss.getSheetByName('Current');
    if (!primarySheet) throw new Error('Sheet "Current" not found');
    
    // Export and clean
    const sheetData = exportCleanSheet(primarySheet);
    console.log(`✅ Exported ${sheetData.rows.length} creators from Current`);
    
    // Generate data.js
    const dataJsContent = generateDataJS(sheetData, 'Current');
    console.log(`✅ Generated data.js (${dataJsContent.length} chars)`);
    
    // Push data.js
    const dataJsResult = pushToGitHub(
      dataJsContent, 
      SYNC_CONFIG.dataJsPath, 
      `Update data.js from Current sheet @ ${new Date().toISOString()}`,
      config
    );
    results.push({ file: 'data.js', path: SYNC_CONFIG.dataJsPath, status: 'success', commit: dataJsResult.commit.sha.substring(0, 7) });
    
    // Push CSVs
    for (const sheetConfig of SYNC_CONFIG.sheets) {
      try {
        const sheet = ss.getSheetByName(sheetConfig.name);
        if (!sheet) {
          results.push({ file: sheetConfig.name, status: 'skipped', error: 'Not found' });
          continue;
        }
        
        const data = exportCleanSheet(sheet);
        const csv = toCSV(data.headers, data.rows);
        
        const result = pushToGitHub(
          csv,
          sheetConfig.csvPath,
          `Auto-sync: ${sheetConfig.name} @ ${new Date().toISOString()}`,
          config
        );
        results.push({ file: sheetConfig.name, path: sheetConfig.csvPath, status: 'success', commit: result.commit.sha.substring(0, 7) });
        
      } catch (e) {
        results.push({ file: sheetConfig.name, status: 'error', error: e.message });
      }
    }
    
    const duration = (new Date() - startTime) / 1000;
    const success = results.filter(r => r.status === 'success').length;
    
    console.log(`✅ Sync complete: ${success}/${results.length} files in ${duration}s`);
    logResults(results, duration);
    
    return { success: success === results.length, timestamp: new Date().toISOString(), duration, results };
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    throw error;
  }
}

// Test
function testSync() { return syncAllToGitHub(); }

// ============================================
// SETUP
// ============================================
function setupSync() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();
  
  const token = ui.prompt('GitHub Token', 'Enter token:', ui.ButtonSet.OK_CANCEL);
  if (token.getSelectedButton() !== ui.Button.OK) return;
  props.setProperty('GITHUB_TOKEN', token.getResponseText().trim());
  props.setProperty('GITHUB_OWNER', 'ceyre-boop');
  props.setProperty('GITHUB_REPO', 'TABOOST_Platfrom');
  
  ui.alert('✅ Setup complete! Run testSync() to verify.');
}

function loadConfig() {
  const p = PropertiesService.getScriptProperties();
  return {
    GITHUB_TOKEN: p.getProperty('GITHUB_TOKEN'),
    GITHUB_OWNER: p.getProperty('GITHUB_OWNER') || 'ceyre-boop',
    GITHUB_REPO: p.getProperty('GITHUB_REPO') || 'TABOOST_Platfrom'
  };
}

// ============================================
// TRIGGERS & LOGGING
// ============================================
function createHourlyTrigger() {
  deleteTriggers();
  ScriptApp.newTrigger('syncAllToGitHub').timeBased().everyHours(1).create();
  SpreadsheetApp.getUi().alert('✅ Hourly sync enabled');
}

function createDailyTrigger() {
  deleteTriggers();
  ScriptApp.newTrigger('syncAllToGitHub').timeBased().everyDays(1).atHour(2).create();
  SpreadsheetApp.getUi().alert('✅ Daily sync at 2 AM enabled');
}

function deleteTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'syncAllToGitHub') ScriptApp.deleteTrigger(t);
  });
}

function stopSync() {
  deleteTriggers();
  SpreadsheetApp.getUi().alert('⏸️ Sync stopped');
}

function logResults(results, duration) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let log = ss.getSheetByName('Sync Log');
    if (!log) {
      log = ss.insertSheet('Sync Log');
      log.appendRow(['Time', 'Duration', 'File', 'Path', 'Status', 'Commit']);
    }
    results.forEach(r => {
      log.appendRow([new Date().toISOString(), duration + 's', r.file, r.path || '', r.status, r.commit || r.error || '']);
    });
  } catch (e) {}
}

// ============================================
// MENU
// ============================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔄 TABOOST SYNC')
    .addItem('⚡ Sync Now', 'syncAllToGitHub')
    .addItem('🔧 Setup', 'setupSync')
    .addItem('⏰ Hourly', 'createHourlyTrigger')
    .addItem('⏰ Daily', 'createDailyTrigger')
    .addItem('⏸️ Stop', 'stopSync')
    .addToUi();
}