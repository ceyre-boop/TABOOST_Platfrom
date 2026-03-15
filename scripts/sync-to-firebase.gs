// Google Apps Script for TABOOST - Sync Google Sheets to Firebase
// This goes in your Google Sheet: Extensions → Apps Script

// CONFIG - Update these with your Firebase details
const FIREBASE_PROJECT_ID = 'taboost-platform';
const FIREBASE_API_KEY = 'AIzaSyBrApQHC1Fvbjm9EVTptt2kNG2mDb1PzXE';

// Firestore REST API base URL
const FIRESTORE_BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

function syncToFirebase() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  const dataSheet = sheet.getSheetByName('Current month');
  
  if (!dataSheet) {
    console.error('Sheet "Current month" not found!');
    return;
  }
  
  const data = dataSheet.getDataRange().getValues();
  const headers = data[0];
  
  // Find column indices
  const colIndex = {};
  headers.forEach((h, i) => {
    colIndex[h.toString().toLowerCase().replace(/\s+/g, '_')] = i;
  });
  
  console.log('Columns found:', Object.keys(colIndex));
  
  // Process creators
  const creators = [];
  const batchSize = 500; // Firestore batch limit
  let batch = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // Skip empty rows
    
    const creator = {
      creatorId: row[colIndex.creator_id]?.toString() || row[0]?.toString() || `row_${i}`,
      username: row[colIndex.username || colIndex.creator]?.toString() || '',
      agent: row[colIndex.agent || colIndex.manager]?.toString() || '',
      tier: parseInt(row[colIndex.tier || colIndex.level]) || 0,
      diamonds: parseInt(row[colIndex.diamonds || colIndex.total_diamonds]) || 0,
      rewards: parseInt(row[colIndex.rewards || colIndex.total_rewards]) || 0,
      hours: parseInt(row[colIndex.hours || colIndex.hours_streamed]) || 0,
      score: parseInt(row[colIndex.score || colIndex.creator_score]) || 0,
      updatedAt: new Date().toISOString()
    };
    
    // Calculate efficiency
    creator.diamondsPerHour = creator.hours > 0 ? Math.round(creator.diamonds / creator.hours) : 0;
    
    batch.push(creator);
    
    // Send batch when full
    if (batch.length >= batchSize) {
      sendBatchToFirestore(batch);
      batch = [];
      Utilities.sleep(1000); // Rate limiting
    }
  }
  
  // Send remaining
  if (batch.length > 0) {
    sendBatchToFirestore(batch);
  }
  
  // Update summary
  updateSummary(creators);
  
  console.log(`Synced ${creators.length} creators to Firebase`);
}

function sendBatchToFirestore(creators) {
  creators.forEach(creator => {
    const url = `${FIRESTORE_BASE_URL}/creators/${creator.creatorId}?key=${FIREBASE_API_KEY}`;
    
    const payload = {
      fields: {
        creatorId: { stringValue: creator.creatorId },
        username: { stringValue: creator.username },
        agent: { stringValue: creator.agent },
        tier: { integerValue: creator.tier },
        diamonds: { integerValue: creator.diamonds },
        rewards: { integerValue: creator.rewards },
        hours: { integerValue: creator.hours },
        score: { integerValue: creator.score },
        diamondsPerHour: { integerValue: creator.diamondsPerHour },
        updatedAt: { stringValue: creator.updatedAt }
      }
    };
    
    const options = {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      payload: JSON.stringify(payload)
    };
    
    try {
      UrlFetchApp.fetch(url, options);
    } catch (e) {
      console.error(`Error sending ${creator.username}:`, e);
    }
  });
}

function updateSummary(creators) {
  const summary = {
    totalCreators: creators.length,
    totalDiamonds: creators.reduce((sum, c) => sum + c.diamonds, 0),
    totalRewards: creators.reduce((sum, c) => sum + c.rewards, 0),
    totalHours: creators.reduce((sum, c) => sum + c.hours, 0),
    activeCreators: creators.filter(c => c.hours > 0).length,
    lastUpdate: new Date().toISOString()
  };
  
  const url = `${FIRESTORE_BASE_URL}/summary/dashboard?key=${FIREBASE_API_KEY}`;
  
  const payload = {
    fields: {
      totalCreators: { integerValue: summary.totalCreators },
      totalDiamonds: { integerValue: summary.totalDiamonds },
      totalRewards: { integerValue: summary.totalRewards },
      totalHours: { integerValue: summary.totalHours },
      activeCreators: { integerValue: summary.activeCreators },
      lastUpdate: { stringValue: summary.lastUpdate }
    }
  };
  
  const options = {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    payload: JSON.stringify(payload)
  };
  
  UrlFetchApp.fetch(url, options);
}

// Set up hourly auto-sync
function createHourlyTrigger() {
  // Delete existing triggers
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'syncToFirebase') {
      ScriptApp.deleteTrigger(t);
    }
  });
  
  // Create new hourly trigger
  ScriptApp.newTrigger('syncToFirebase')
    .timeBased()
    .everyHours(1)
    .create();
  
  console.log('Hourly sync trigger created!');
}

// Run this once to authorize and test
function testSync() {
  syncToFirebase();
}