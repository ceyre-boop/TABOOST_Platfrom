// ============================================================================
// DEBUG SCRIPT - Check what's in your Google Sheet before pushing
// ============================================================================

function debugRewardsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Rewards');
  
  if (!sheet) {
    console.log('❌ ERROR: Sheet "Rewards" not found!');
    console.log('Available sheets:', ss.getSheets().map(s => s.getName()));
    return;
  }
  
  const data = sheet.getDataRange().getValues();
  console.log('✅ Found Rewards sheet with', data.length, 'rows');
  
  // Get headers
  const headers = data[0];
  console.log('📋 Headers:', headers.join(', '));
  
  // Find the Date column
  const dateColIndex = headers.findIndex(h => h.toString().toLowerCase().includes('date'));
  console.log('📅 Date column index:', dateColIndex);
  
  // Show last 10 rows with dates
  console.log('\n📊 LAST 10 ROWS:');
  const startRow = Math.max(1, data.length - 10);
  for (let i = startRow; i < data.length; i++) {
    const row = data[i];
    const date = dateColIndex >= 0 ? row[dateColIndex] : 'N/A';
    const username = row[1] || 'N/A'; // TikTok column
    const type = row[2] || 'N/A'; // Type column
    console.log(`Row ${i + 1}: ${username} | ${type} | ${date}`);
  }
  
  // Find latest date
  let latestDate = null;
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (dateColIndex >= 0 && row[dateColIndex]) {
      const dateStr = row[dateColIndex].toString();
      if (dateStr.includes('/')) {
        latestDate = dateStr;
      }
    }
  }
  console.log('\n🗓️ LATEST DATE IN SHEET:', latestDate);
}

function debugAndSync() {
  console.log('=== DEBUG START ===\n');
  
  // Step 1: Check what's in the sheet
  debugRewardsSheet();
  
  // Step 2: Try to export
  console.log('\n=== EXPORT TEST ===');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Rewards');
  
  if (sheet) {
    const gid = sheet.getSheetId();
    const sheetId = ss.getId();
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
    
    console.log('Export URL:', exportUrl);
    
    try {
      const response = UrlFetchApp.fetch(exportUrl, {
        headers: { 'Authorization': `Bearer ${ScriptApp.getOAuthToken()}` }
      });
      
      const csvText = response.getContentText();
      const lines = csvText.split('\n');
      console.log('✅ Export successful! Lines:', lines.length);
      console.log('First few lines:');
      lines.slice(0, 5).forEach((line, i) => console.log(`  ${i}: ${line.substring(0, 100)}`));
      
    } catch (e) {
      console.error('❌ Export failed:', e.message);
    }
  }
  
  console.log('\n=== DEBUG END ===');
}

// Run this to see what's happening
function runDebug() {
  debugAndSync();
}