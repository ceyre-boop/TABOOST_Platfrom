// ============================================================================
// FIREBASE AUTH SYNC - Only Adds New Login Accounts
// ============================================================================
// Creates Firebase Authentication accounts for new creators only
// Does NOT touch Firestore - just creates login accounts
// ============================================================================

const FIREBASE_API_KEY = "AIzaSyBrApQHC1Fvbjm9EVTptt2kNG2mDb1PzXE";
const PROJECT_ID = "taboost-platform";

// ============================================
// MAIN: Sync Sheet → Firebase Auth
// ============================================
function syncNewAuthAccounts() {
  console.log('🔐 FIREBASE AUTH SYNC');
  console.log('====================\n');
  
  // 1. Get usernames from Google Sheet
  const sheetUsers = getUsernamesFromSheet();
  console.log(`📊 Sheet: ${sheetUsers.length} usernames`);
  
  // 2. Get existing Firebase Auth users
  const authUsers = getExistingAuthUsers();
  console.log(`🔐 Firebase Auth: ${authUsers.length} accounts`);
  
  // 3. Find NEW users only
  const newUsers = findNewUsersOnly(sheetUsers, authUsers);
  console.log(`\n✨ NEW USERS: ${newUsers.length}`);
  
  if (newUsers.length === 0) {
    console.log('\n✅ Everything up to date! No new accounts needed.');
    return { added: 0, total: authUsers.length };
  }
  
  // 4. Show preview
  console.log('\n📋 PREVIEW - Will create these accounts:');
  newUsers.slice(0, 10).forEach((u, i) => console.log(`   ${i + 1}. ${u.username} (${u.email})`));
  if (newUsers.length > 10) console.log(`   ... and ${newUsers.length - 10} more`);
  
  // 5. Safety check
  if (newUsers.length > 30) {
    console.log(`\n⚠️  That's ${newUsers.length} new accounts!`);
    console.log('   If this looks wrong, STOP and check your data.');
    console.log('\n   To proceed, run: createTheseAuthAccounts()');
    
    // Store for later
    PropertiesService.getScriptProperties().setProperty('pendingAuthUsers', JSON.stringify(newUsers));
    return { status: 'pending', count: newUsers.length };
  }
  
  // 6. Create accounts
  return createAuthAccounts(newUsers, authUsers.length);
}

// ============================================
// GET USERNAMES FROM SHEET (Column C)
// ============================================
function getUsernamesFromSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Current');
  
  if (!sheet) throw new Error('Sheet "Current" not found');
  
  // Get column C (index 2)
  const lastRow = sheet.getLastRow();
  const usernames = sheet.getRange(2, 3, lastRow - 1, 1).getValues(); // Col C, start row 2
  
  const users = [];
  for (const row of usernames) {
    const username = row[0]?.toString().toLowerCase().trim();
    if (!username || username === '' || username.includes('/') || username.includes('@')) continue;
    
    users.push({
      username: username,
      email: `${username}@taboost.me`,
      password: generateTempPassword()
    });
  }
  
  return users;
}

// ============================================
// GET EXISTING FIREBASE AUTH USERS
// ============================================
function getExistingAuthUsers() {
  try {
    // List users from Firebase Auth REST API
    const url = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:batchGet?key=${FIREBASE_API_KEY}&maxResults=1000`;
    
    const response = UrlFetchApp.fetch(url, {
      method: 'GET',
      muteHttpExceptions: true
    });
    
    if (response.getResponseCode() !== 200) {
      console.log('⚠️  Could not read Firebase Auth:', response.getContentText().substring(0, 200));
      return [];
    }
    
    const data = JSON.parse(response.getContentText());
    const users = [];
    
    if (data.users) {
      data.users.forEach(user => {
        const email = user.email || '';
        const username = email.replace('@taboost.me', '').toLowerCase().trim();
        if (username) users.push({ username, email });
      });
    }
    
    return users;
  } catch (e) {
    console.error('Error reading Firebase Auth:', e.message);
    return [];
  }
}

// ============================================
// FIND NEW USERS ONLY
// ============================================
function findNewUsersOnly(sheetUsers, authUsers) {
  const authEmails = new Set(authUsers.map(u => u.email.toLowerCase()));
  
  return sheetUsers.filter(user => !authEmails.has(user.email.toLowerCase()));
}

// ============================================
// CREATE AUTH ACCOUNTS
// ============================================
function createAuthAccounts(users, existingCount) {
  console.log(`\n🚀 Creating ${users.length} Firebase Auth accounts...\n`);
  
  let added = 0;
  let failed = 0;
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    
    try {
      const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`;
      
      const response = UrlFetchApp.fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        payload: JSON.stringify({
          email: user.email,
          password: user.password,
          displayName: user.username
        }),
        muteHttpExceptions: true
      });
      
      const code = response.getResponseCode();
      
      if (code === 200) {
        added++;
        console.log(`✅ ${i + 1}/${users.length}: ${user.username}`);
      } else {
        failed++;
        const error = JSON.parse(response.getContentText());
        console.error(`❌ ${i + 1}/${users.length}: ${user.username} - ${error.error?.message || 'Unknown error'}`);
      }
      
      // Rate limit
      if ((i + 1) % 5 === 0) Utilities.sleep(1000);
      
    } catch (e) {
      failed++;
      console.error(`❌ ${i + 1}/${users.length}: ${user.username} - ${e.message}`);
    }
  }
  
  console.log('\n=====================================');
  console.log('✅ COMPLETE');
  console.log(`📊 Created: ${added}, Failed: ${failed}`);
  console.log(`🔐 Total Auth Accounts: ${existingCount + added}`);
  
  return { added, failed, total: existingCount + added };
}

// ============================================
// CONFIRM ADD (for >30 users)
// ============================================
function createTheseAuthAccounts() {
  const props = PropertiesService.getScriptProperties();
  const pending = props.getProperty('pendingAuthUsers');
  
  if (!pending) {
    console.log('No pending users. Run syncNewAuthAccounts() first.');
    return;
  }
  
  const users = JSON.parse(pending);
  const authUsers = getExistingAuthUsers();
  
  return createAuthAccounts(users, authUsers.length);
}

// ============================================
// HELPERS
// ============================================
function generateTempPassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let pass = '';
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass + '!';
}

// ============================================
// MENU
// ============================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🔐 AUTH SYNC')
    .addItem('🔒 Safe Sync', 'syncNewAuthAccounts')
    .addItem('✅ Confirm Add (>30)', 'createTheseAuthAccounts')
    .addToUi();
}

function runAuthSync() {
  return syncNewAuthAccounts();
}