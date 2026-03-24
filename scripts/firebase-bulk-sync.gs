// ============================================================================
// TABOOST FIREBASE BULK IMPORT - Only Adds New Creators
// ============================================================================
// Reads Google Sheet, checks Firebase, only imports NEW creators
// No more re-adding 800+ people every week!
// ============================================================================

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBrApQHC1Fvbjm9EVTptt2kNG2mDb1PzXE",
  authDomain: "taboost-platform.firebaseapp.com",
  projectId: "taboost-platform",
  databaseURL: "https://taboost-platform-default-rtdb.firebaseio.com"
};

// ============================================
// MAIN SYNC - Sheet → Firebase
// ============================================
function syncNewCreatorsToFirebase() {
  const startTime = new Date();
  console.log(`🚀 Starting Firebase sync at ${startTime.toISOString()}`);
  
  try {
    // 1. Get creators from Google Sheet
    const sheetCreators = getCreatorsFromSheet();
    console.log(`📊 Found ${sheetCreators.length} creators in sheet`);
    
    // 2. Get existing creators from Firebase
    const existingCreators = getExistingCreatorsFromFirebase();
    console.log(`📦 Found ${existingCreators.length} creators already in Firebase`);
    
    // 3. Find NEW creators only
    const newCreators = sheetCreators.filter(sheetCreator => {
      const username = sheetCreator.username.toLowerCase().trim();
      return !existingCreators.some(existing => 
        existing.username.toLowerCase().trim() === username
      );
    });
    
    console.log(`✨ Found ${newCreators.length} NEW creators to add`);
    
    if (newCreators.length === 0) {
      console.log('✅ No new creators to add - everything is up to date!');
      return { added: 0, total: existingCreators.length };
    }
    
    // 4. Add new creators to Firebase
    let added = 0;
    let failed = 0;
    
    for (const creator of newCreators) {
      try {
        addCreatorToFirebase(creator);
        added++;
        console.log(`✅ Added: ${creator.username}`);
        
        // Rate limiting - don't overwhelm Firebase
        if (added % 10 === 0) {
          Utilities.sleep(1000);
        }
      } catch (e) {
        failed++;
        console.error(`❌ Failed to add ${creator.username}:`, e.message);
      }
    }
    
    const duration = (new Date() - startTime) / 1000;
    console.log(`\n✅ Sync complete in ${duration}s`);
    console.log(`📊 Added: ${added}, Failed: ${failed}, Total in Firebase: ${existingCreators.length + added}`);
    
    return { added, failed, total: existingCreators.length + added };
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    throw error;
  }
}

// ============================================
// GET CREATORS FROM SHEET
// ============================================
function getCreatorsFromSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Current month'); // or 'Current'
  
  if (!sheet) {
    throw new Error('Sheet "Current month" not found!');
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Find column indices
  const usernameCol = headers.findIndex(h => 
    h.toString().toLowerCase().includes('tiktok') || 
    h.toString().toLowerCase().includes('username') ||
    /^\d{1,2}\/\d{1,2}$/.test(h) // Date column like "3/24"
  );
  
  const emailCol = headers.findIndex(h => h.toString().toLowerCase().includes('email'));
  const creatorIdCol = headers.findIndex(h => h.toString().toLowerCase().includes('host') || h.toString().toLowerCase().includes('creator id'));
  
  const creators = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const username = row[usernameCol]?.toString().toLowerCase().trim();
    
    if (!username || username === '' || username.includes('@')) continue;
    
    creators.push({
      username: username,
      email: row[emailCol] || `${username}@taboost.me`,
      creatorId: row[creatorIdCol] || '',
      name: username,
      createdAt: new Date().toISOString()
    });
  }
  
  return creators;
}

// ============================================
// GET EXISTING CREATORS FROM FIREBASE
// ============================================
function getExistingCreatorsFromFirebase() {
  try {
    // Query Firebase Firestore for existing creators
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/creators?key=${FIREBASE_CONFIG.apiKey}`;
    
    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() !== 200) {
      console.log('No existing creators found or API error');
      return [];
    }
    
    const data = JSON.parse(response.getContentText());
    const creators = [];
    
    if (data.documents) {
      data.documents.forEach(doc => {
        const fields = doc.fields || {};
        creators.push({
          username: fields.username?.stringValue || '',
          email: fields.email?.stringValue || ''
        });
      });
    }
    
    return creators;
  } catch (e) {
    console.error('Error reading from Firebase:', e.message);
    return [];
  }
}

// ============================================
// ADD CREATOR TO FIREBASE
// ============================================
function addCreatorToFirebase(creator) {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/creators/${creator.username}?key=${FIREBASE_CONFIG.apiKey}`;
  
  const payload = {
    fields: {
      username: { stringValue: creator.username },
      email: { stringValue: creator.email },
      name: { stringValue: creator.name },
      creatorId: { stringValue: creator.creatorId },
      createdAt: { stringValue: creator.createdAt },
      claimed: { booleanValue: false },
      role: { stringValue: 'creator' }
    }
  };
  
  const response = UrlFetchApp.fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  
  if (response.getResponseCode() !== 200 && response.getResponseCode() !== 201) {
    throw new Error(`Firebase error: ${response.getContentText()}`);
  }
}

// ============================================
// SETUP & MENU
// ============================================
function setupFirebaseSync() {
  const ui = SpreadsheetApp.getUi();
  
  ui.alert('✅ Firebase sync ready!\n\nThis will:\n1. Read your Google Sheet\n2. Check who is already in Firebase\n3. Only add NEW creators\n\nRun syncNewCreatorsToFirebase() to start.');
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔥 FIREBASE SYNC')
    .addItem('✨ Sync New Creators Only', 'syncNewCreatorsToFirebase')
    .addItem('🔧 Setup', 'setupFirebaseSync')
    .addItem('📊 Check Sheet Count', 'showSheetCount')
    .addToUi();
}

function showSheetCount() {
  const creators = getCreatorsFromSheet();
  SpreadsheetApp.getUi().alert(`📊 Found ${creators.length} creators in this sheet`);
}

// Manual run
function runSync() {
  return syncNewCreatorsToFirebase();
}