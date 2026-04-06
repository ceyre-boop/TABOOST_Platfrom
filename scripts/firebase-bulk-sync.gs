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
    
    // 3. Find NEW creators only (exactly like the website does)
    console.log('\n🔍 CHECKING FOR NEW CREATORS:');
    console.log('=====================================');
    
    const newCreators = [];
    const existingUsernames = existingCreators.map(e => e.username.toLowerCase().trim());
    
    for (const sheetCreator of sheetCreators) {
      const username = sheetCreator.username.toLowerCase().trim();
      
      if (existingUsernames.includes(username)) {
        // Already exists - skip
        console.log(`⏭️ SKIP (exists): ${username}`);
      } else {
        // New creator - add to list
        newCreators.push(sheetCreator);
        console.log(`✨ NEW: ${username}`);
      }
    }
    
    console.log(`✨ Found ${newCreators.length} NEW creators to add`);
    
    if (newCreators.length === 0) {
      console.log('✅ No new creators to add - everything is up to date!');
      return { added: 0, total: existingCreators.length };
    }
    
    // 4. Add new creators to Firebase
    let added = 0;
    let failed = 0;
    
    console.log('\n📝 NEW CREATORS TO ADD:');
    console.log('=====================================');
    
    for (let i = 0; i < newCreators.length; i++) {
      const creator = newCreators[i];
      console.log(`${i + 1}. ${creator.username} (${creator.email})`);
    }
    
    console.log('\n🚀 ADDING TO FIREBASE:');
    console.log('=====================================');
    
    for (const creator of newCreators) {
      try {
        console.log(`➕ Adding: ${creator.username}...`);
        addCreatorToFirebase(creator);
        added++;
        console.log(`✅ SUCCESS: ${creator.username} added!`);
        
        // Rate limiting - don't overwhelm Firebase
        if (added % 10 === 0) {
          console.log('⏳ Pausing for rate limit...');
          Utilities.sleep(1000);
        }
      } catch (e) {
        failed++;
        console.error(`❌ FAILED: ${creator.username} - ${e.message}`);
      }
    }
    
    const duration = (new Date() - startTime) / 1000;
    
    console.log('\n📋 SUMMARY - NEW CREATORS ADDED:');
    console.log('=====================================');
    if (added > 0) {
      newCreators.slice(0, added).forEach((creator, i) => {
        console.log(`${i + 1}. ${creator.username}`);
      });
    } else {
      console.log('No new creators added.');
    }
    
    console.log('\n✅ SYNC COMPLETE');
    console.log('=====================================');
    console.log(`⏱️ Duration: ${duration}s`);
    console.log(`✨ Added: ${added}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total in Firebase: ${existingCreators.length + added}`);
    
    return { added, failed, total: existingCreators.length + added };
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    throw error;
  }
}

// ============================================
// GET CREATORS FROM SHEET - Columns B & C only
// Column B = Host (CID/Creator ID)
// Column C = TikTok Username (column 2 in 0-indexed = Column C)
// ============================================
function getCreatorsFromSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Try multiple possible sheet names
  const possibleNames = ['Current month', 'Current', 'current', 'Live Data', 'Creators'];
  let sheet = null;
  
  for (const name of possibleNames) {
    sheet = ss.getSheetByName(name);
    if (sheet) {
      console.log(`✅ Found sheet: "${name}"`);
      break;
    }
  }
  
  // If not found, list available sheets
  if (!sheet) {
    const availableSheets = ss.getSheets().map(s => `"${s.getName()}"`).join(', ');
    throw new Error(`Sheet not found! Available: ${availableSheets}`);
  }
  
  // Get just columns B and C (indices 1 and 2)
  // Column A = index 0, Column B = index 1, Column C = index 2
  const lastRow = sheet.getLastRow();
  const range = sheet.getRange(2, 2, lastRow - 1, 2); // Start row 2, col B, get 2 columns (B & C)
  const data = range.getValues();
  
  const creators = [];
  
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const creatorId = row[0]?.toString().trim(); // Column B
    const username = row[1]?.toString().toLowerCase().trim(); // Column C
    
    // Skip empty rows or invalid usernames
    if (!username || username === '' || username.includes('/') || username.includes('@')) continue;
    
    creators.push({
      username: username,
      email: `${username}@taboost.me`,
      creatorId: creatorId || '',
      name: username,
      createdAt: new Date().toISOString()
    });
  }
  
  console.log(`📊 Parsed ${creators.length} creators from columns B & C`);
  return creators;
}

// ============================================
// GET EXISTING CREATORS FROM FIREBASE
// ============================================
function getExistingCreatorsFromFirebase() {
  try {
    // Query Firebase Firestore for existing creators
    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/creators?pageSize=1000&key=${FIREBASE_CONFIG.apiKey}`;
    
    console.log('📡 Fetching existing creators from Firebase...');
    
    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() !== 200) {
      console.log('⚠️ Could not read Firebase (may be empty):', response.getContentText().substring(0, 200));
      return [];
    }
    
    const data = JSON.parse(response.getContentText());
    const creators = [];
    
    if (data.documents) {
      data.documents.forEach(doc => {
        const fields = doc.fields || {};
        const username = fields.username?.stringValue || '';
        if (username) {
          creators.push({
            username: username.toLowerCase().trim(),
            email: fields.email?.stringValue || ''
          });
        }
      });
    }
    
    console.log(`📦 Found ${creators.length} creators already in Firebase`);
    
    // Show first 5 as sample
    if (creators.length > 0) {
      console.log('Sample existing creators:', creators.slice(0, 5).map(c => c.username).join(', '));
    }
    
    return creators;
  } catch (e) {
    console.error('❌ Error reading from Firebase:', e.message);
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