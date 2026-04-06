// ============================================================================
// QUICK TEST - See what's actually being exported from Rewards sheet
// ============================================================================

function testRewardsExport() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Rewards');
  
  if (!sheet) {
    console.log('❌ Sheet "Rewards" not found!');
    return;
  }
  
  // Get GID and export
  const gid = sheet.getSheetId();
  const sheetId = ss.getId();
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  
  console.log('Exporting from:', sheet.getName());
  console.log('GID:', gid);
  
  const response = UrlFetchApp.fetch(exportUrl, {
    headers: { 'Authorization': `Bearer ${ScriptApp.getOAuthToken()}` }
  });
  
  const csvText = response.getContentText();
  const lines = csvText.split('\n');
  
  console.log('\n✅ Total lines:', lines.length);
  console.log('\n📋 First 5 lines:');
  lines.slice(0, 5).forEach((line, i) => {
    console.log(`  ${i + 1}: ${line.substring(0, 120)}...`);
  });
  
  // Find latest date
  console.log('\n📅 Searching for latest dates...');
  const dateRegex = /(\d{1,2}\/\d{1,2}\/\d{4})/;
  let latestDate = null;
  let latestRow = null;
  
  for (let i = 1; i < lines.length && i < 50; i++) {
    const match = lines[i].match(dateRegex);
    if (match) {
      console.log(`  Row ${i + 1}: ${match[1]} - ${lines[i].substring(0, 80)}`);
      if (!latestDate) {
        latestDate = match[1];
        latestRow = lines[i];
      }
    }
  }
  
  console.log('\n🗓️ Latest date found:', latestDate);
}

// Run this to test
function runTest() {
  testRewardsExport();
}