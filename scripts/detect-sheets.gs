// ============================================================================
// DETECT SHEETS - Find your actual sheet tab names
// ============================================================================

function detectSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  
  console.log('📋 ALL SHEETS IN YOUR SPREADSHEET:');
  console.log('=====================================');
  
  sheets.forEach((sheet, i) => {
    console.log(`${i + 1}. "${sheet.getName()}" (${sheet.getLastRow()} rows)`);
  });
  
  console.log('\n✅ CORRECT CONFIG FOR CREATOR-SYNC:');
  console.log('=====================================');
  console.log(`
const SHEET_CONFIG = [
  { tabName: '${sheets[0].getName()}', outputPath: 'data/current.csv' },
  { tabName: '${sheets[1] ? sheets[1].getName() : 'Sheet2'}', outputPath: 'data/rewards-history.csv' },
  { tabName: '${sheets[2] ? sheets[2].getName() : 'Sheet3'}', outputPath: 'data/history.csv' }
];
  `);
  
  // Find sheets that might be Current/Rewards/History
  const currentSheet = sheets.find(s => s.getName().toLowerCase().includes('current'));
  const rewardsSheet = sheets.find(s => s.getName().toLowerCase().includes('reward'));
  const historySheet = sheets.find(s => s.getName().toLowerCase().includes('history'));
  
  console.log('\n🔍 DETECTED SHEETS:');
  if (currentSheet) console.log(`✅ Current data: "${currentSheet.getName()}"`);
  if (rewardsSheet) console.log(`✅ Rewards data: "${rewardsSheet.getName()}"`);
  if (historySheet) console.log(`✅ History data: "${historySheet.getName()}"`);
}

// Run this to see your sheet names
function runDetect() {
  detectSheets();
}