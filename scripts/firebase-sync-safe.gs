// ============================================================================
// SAFE FIREBASE SYNC - Only Adds New Creators (Fixed)
// ============================================================================
// VERSION 2: Properly reads Firebase before adding anyone
// ============================================================================

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBrApQHC1Fvbjm9EVTptt2kNG2mDb1PzXE",
  authDomain: "taboost-platform.firebaseapp.com",
  projectId: "taboost-platform",
  databaseURL: "https://taboost-platform-default-rtdb.firebaseio.com"
};

// ============================================
// MAIN FUNCTION - Safe sync with verification
// ============================================
function syncNewCreatorsSafe() {
  console.log('🔒 SAFE SYNC MODE - Verification required');
  console.log('=====================================\n');
  
  // STEP 1: Get creators from Google Sheet
  const sheetCreators = getCreatorsFromSheetSafe();
  console.log(`📊 Found ${sheetCreators.length} creators in Google Sheet`);
  
  // STEP 2: Verify we can read Firebase
  console.log('\n📡 Testing Firebase connection...');
  const firebaseTest = testFirebaseAccess();
  
  if (!firebaseTest.success) {
    console.error('❌ CANNOT READ FIREBASE:', firebaseTest.error);
    console.log('\n⚠️  SAFETY STOP: Cannot verify existing creators.');
    console.log('   Without this check, we might add duplicates.');
    console.log('\nOptions:');
    console.log('1. Check Firebase permissions');
    console.log('2. Run with manual override (not recommended)');
    return { error: 'Firebase read failed', sheetCount: sheetCreators.length };
  }
  
  // STEP 3: Get existing creators
  const existingCreators = firebaseTest.creators;
  console.log(`✅ Found ${existingCreators.length} creators already in Firebase`);
  
  // STEP 4: Find new creators
  const newCreators = findNewCreatorsOnly(sheetCreators, existingCreators);
  
  // STEP 5: Safety check - if more than 50 new, require confirmation
  if (newCreators.length > 50) {
    console.log(`\n⚠️  WARNING: Found ${newCreators.length} new creators.`);
    console.log('   This seems high - double check before proceeding.');
    console.log('\n   First 10 new creators:');
    newCreators.slice(0, 10).forEach((c, i) => console.log(`   ${i + 1}. ${c.username}`));
    console.log(`\n   Run addTheseCreatorsToFirebase() to proceed with adding ${newCreators.length} creators`);
    
    // Store in cache for manual confirmation
    CacheService.getScriptCache().put('pendingCreators', JSON.stringify(newCreators), 3600);
    
    return { 
      status: 'pending_confirmation', 
      newCount: newCreators.length, 
      existingCount: existingCreators.length,
      sample: newCreators.slice(0, 10).map(c => c.username)
    };
  }
  
  // STEP 6: Add new creators (if 50 or less)
  return addCreatorsToFirebase(newCreators, existingCreators.length);
}

// ============================================
// TEST FIREBASE ACCESS
// ============================================
function testFirebaseAccess() {
  try {
    // Try multiple methods to read Firebase
    
    // Method 1: Try Firestore REST API
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/creators?pageSize=1000&key=${FIREBASE_CONFIG.apiKey}`;
    
    const response = UrlFetchApp.fetch(firestoreUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      muteHttpExceptions: true
    });
    
    const code = response.getResponseCode();
    const text = response.getContentText();
    
    console.log(`   Firestore API response: ${code}`);
    
    if (code === 200) {
      const data = JSON.parse(text);
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
      
      return { success: true, creators: creators, method: 'firestore' };
    }
    
    // If we get here, Firestore failed
    console.log('   Firestore error:', text.substring(0, 200));
    
    return { 
      success: false, 
      error: `Firestore API returned ${code}: ${text.substring(0, 200)}`,
      creators: []
    };
    
  } catch (e) {
    return { success: false, error: e.message, creators: [] };
  }
}

// ============================================
// GET CREATORS FROM SHEET
// ============================================
function getCreatorsFromSheetSafe() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Current');
  
  if (!sheet) {
    throw new Error('Sheet "Current" not found!');
  }
  
  // Get columns B (CID) and C (Username)
  const lastRow = sheet.getLastRow();
  const data = sheet.getRange(2, 2, lastRow - 1, 2).getValues(); // Start row 2, col B, get 2 columns
  
  const creators = [];
  
  for (const row of data) {
    const creatorId = row[0]?.toString().trim();
    const username = row[1]?.toString().toLowerCase().trim();
    
    // Skip invalid rows
    if (!username || username === '' || username.includes('/') || username.includes('@')) continue;
    if (username.length < 2) continue; // Too short
    
    creators.push({
      username: username,
      email: `${username}@taboost.me`,
      creatorId: creatorId || '',
      name: username
    });
  }
  
  return creators;
}

// ============================================
// FIND NEW CREATORS ONLY
// ============================================
function findNewCreatorsOnly(sheetCreators, existingCreators) {
  console.log('\n🔍 Comparing sheet vs Firebase...');
  
  // Create Set of existing usernames for fast lookup
  const existingSet = new Set(existingCreators.map(c => c.username.toLowerCase().trim()));
  
  const newCreators = [];
  const skipped = [];
  
  for (const creator of sheetCreators) {
    if (existingSet.has(creator.username)) {
      skipped.push(creator.username);
    } else {
      newCreators.push(creator);
    }
  }
  
  console.log(`   ✅ New: ${newCreators.length}`);
  console.log(`   ⏭️  Already exist: ${skipped.length}`);
  
  if (skipped.length > 0) {
    console.log(`   Sample existing: ${skipped.slice(0, 5).join(', ')}...`);
  }
  
  return newCreators;
}

// ============================================
// ADD CREATORS TO FIREBASE (Manual confirmation required for >50)
// ============================================
function addTheseCreatorsToFirebase() {
  const cache = CacheService.getScriptCache();
  const pendingJson = cache.get('pendingCreators');
  
  if (!pendingJson) {
    console.log('No pending creators found. Run syncNewCreatorsSafe() first.');
    return;
  }
  
  const newCreators = JSON.parse(pendingJson);
  
  console.log(`⚠️  ABOUT TO ADD ${newCreators.length} CREATORS TO FIREBASE`);
  console.log('=====================================\n');
  
  // Show first 20
  console.log('First 20 to be added:');
  newCreators.slice(0, 20).forEach((c, i) => console.log(`${i + 1}. ${c.username}`));
  
  if (newCreators.length > 20) {
    console.log(`... and ${newCreators.length - 20} more`);
  }
  
  console.log('\n⚠️  This action cannot be undone easily!');
  console.log('   If this looks wrong, STOP NOW and check your data.');
  console.log('\n   To proceed, run: confirmAddToFirebase()');
}

function confirmAddToFirebase() {
  const cache = CacheService.getScriptCache();
  const pendingJson = cache.get('pendingCreators');
  
  if (!pendingJson) {
    console.log('No pending creators. Run syncNewCreatorsSafe() first.');
    return;
  }
  
  const newCreators = JSON.parse(pendingJson);
  const existingTest = testFirebaseAccess();
  
  return addCreatorsToFirebase(newCreators, existingTest.creators.length);
}

// ============================================
// ACTUAL ADD FUNCTION
// ============================================
function addCreatorsToFirebase(newCreators, existingCount) {
  console.log(`\n🚀 Adding ${newCreators.length} creators to Firebase...\n`);
  
  let added = 0;
  let failed = 0;
  const failures = [];
  
  for (let i = 0; i < newCreators.length; i++) {
    const creator = newCreators[i];
    
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_CONFIG.projectId}/databases/(default)/documents/creators/${creator.username}?key=${FIREBASE_CONFIG.apiKey}`;
      
      const payload = {
        fields: {
          username: { stringValue: creator.username },
          email: { stringValue: creator.email },
          name: { stringValue: creator.name },
          creatorId: { stringValue: creator.creatorId },
          createdAt: { stringValue: new Date().toISOString() },
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
      
      if (response.getResponseCode() === 200 || response.getResponseCode() === 201) {
        added++;
        console.log(`✅ ${i + 1}/${newCreators.length}: ${creator.username}`);
      } else {
        failed++;
        failures.push({ username: creator.username, error: response.getContentText() });
        console.error(`❌ ${i + 1}/${newCreators.length}: ${creator.username} - ${response.getContentText().substring(0, 100)}`);
      }
      
      // Rate limiting
      if ((i + 1) % 10 === 0) {
        console.log('   (pausing for rate limit...)');
        Utilities.sleep(1000);
      }
      
    } catch (e) {
      failed++;
      failures.push({ username: creator.username, error: e.message });
      console.error(`❌ ${i + 1}/${newCreators.length}: ${creator.username} - ${e.message}`);
    }
  }
  
  // Clear cache
  CacheService.getScriptCache().remove('pendingCreators');
  
  // Summary
  console.log('\n=====================================');
  console.log('✅ SYNC COMPLETE');
  console.log('=====================================');
  console.log(`📊 Added: ${added}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📦 Total in Firebase: ${existingCount + added}`);
  
  if (failures.length > 0) {
    console.log('\n❌ Failures:');
    failures.slice(0, 10).forEach(f => console.log(`   - ${f.username}: ${f.error.substring(0, 100)}`));
  }
  
  return { added, failed, total: existingCount + added };
}

// ============================================
// MENU
// ============================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔥 FIREBASE SYNC (SAFE)')
    .addItem('🔒 Safe Sync (Recommended)', 'syncNewCreatorsSafe')
    .addItem('✅ Confirm Add (if >50 new)', 'addTheseCreatorsToFirebase')
    .addItem('🚀 Final Confirm Add', 'confirmAddToFirebase')
    .addSeparator()
    .addItem('📊 Test Firebase Access', 'testFirebaseAccess')
    .addToUi();
}

// Quick test
function runSafeSync() {
  return syncNewCreatorsSafe();
}