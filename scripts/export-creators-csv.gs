// ============================================================================
// EXPORT NEW CREATORS - Generates CSV of potential new creators
// ============================================================================
// Since we can't read Firebase directly, this exports the sheet data
// You can then compare manually or upload to the bulk import website
// ============================================================================

function exportNewCreatorsCSV() {
  console.log('📋 EXPORT NEW CREATORS');
  console.log('======================\n');
  
  // 1. Get all creators from Google Sheet
  const creators = getCreatorsFromSheet();
  console.log(`📊 Total in Sheet: ${creators.length} creators`);
  
  // 2. Generate CSV content
  const csv = generateCSV(creators);
  
  // 3. Save to Google Drive or show in log
  const fileName = `taboost_creators_${new Date().toISOString().split('T')[0]}.csv`;
  
  // Create file in Drive
  const file = DriveApp.createFile(fileName, csv, MimeType.CSV);
  
  console.log('\n✅ CSV Created!');
  console.log(`📁 File: ${fileName}`);
  console.log(`🔗 Link: ${file.getUrl()}`);
  console.log(`📊 Total rows: ${creators.length}`);
  
  console.log('\n📋 FIRST 20 CREATORS:');
  console.log('======================');
  creators.slice(0, 20).forEach((c, i) => {
    console.log(`${i + 1}. ${c.username}`);
  });
  
  console.log('\n⚠️  NEXT STEPS:');
  console.log('1. Download the CSV from Google Drive (link above)');
  console.log('2. Go to bulk import website');
  console.log('3. Upload CSV - it will show only NEW creators');
  console.log('4. Select which ones to add');
  
  return {
    fileName: fileName,
    fileUrl: file.getUrl(),
    totalCreators: creators.length,
    sample: creators.slice(0, 10).map(c => c.username)
  };
}

// ============================================
// GET CREATORS FROM SHEET
// ============================================
function getCreatorsFromSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Current');
  
  if (!sheet) {
    throw new Error('Sheet "Current" not found! Available sheets: ' + 
      ss.getSheets().map(s => s.getName()).join(', '));
  }
  
  // Get columns B (CID) and C (Username)
  const lastRow = sheet.getLastRow();
  const data = sheet.getRange(2, 2, lastRow - 1, 2).getValues();
  
  const creators = [];
  
  for (const row of data) {
    const creatorId = row[0]?.toString().trim();
    const username = row[1]?.toString().toLowerCase().trim();
    
    // Skip invalid
    if (!username || username === '' || username.includes('/') || username.includes('@')) continue;
    if (username.length < 2) continue;
    
    creators.push({
      creatorId: creatorId,
      username: username,
      email: `${username}@taboost.me`,
      tempPassword: generateTempPassword()
    });
  }
  
  return creators;
}

// ============================================
// GENERATE CSV
// ============================================
function generateCSV(creators) {
  const headers = ['CID', 'TikTok', 'Email', 'TempPassword'];
  const rows = creators.map(c => [
    c.creatorId,
    c.username,
    c.email,
    c.tempPassword
  ]);
  
  // Escape values with commas
  const escape = (val) => {
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };
  
  const csvLines = [
    headers.join(','),
    ...rows.map(r => r.map(escape).join(','))
  ];
  
  return csvLines.join('\n');
}

// ============================================
// HELPERS
// ============================================
function generateTempPassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let pass = '';
  for (let i = 0; i < 10; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass + '!';
}

// ============================================
// MENU
// ============================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('📊 EXPORT CREATORS')
    .addItem('📁 Export All to CSV', 'exportNewCreatorsCSV')
    .addItem('📋 Show Count Only', 'showCreatorCount')
    .addToUi();
}

function showCreatorCount() {
  const creators = getCreatorsFromSheet();
  SpreadsheetApp.getUi().alert(`📊 Total creators in sheet: ${creators.length}`);
}

function runExport() {
  return exportNewCreatorsCSV();
}