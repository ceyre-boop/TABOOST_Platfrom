// ============================================================================
// AGENCY CASH BONUS — CLAIM EMAIL (Google Apps Script web app)
// Emails marco@taboost.me when a creator taps "CLAIM BONUS" on the Live
// creator dashboard (live.taboost.me). Mirrors TABOOST-Shop/scripts/tap-bonus-email.gs.
//
// DEPLOY (Marco):
//   1. Open script.google.com → New project → paste this file.
//   2. Run setupCashbackSecret() once (Editor ▸ Run). Authorize when prompted.
//      It prints the shared secret in the execution log — copy it.
//   3. Deploy ▸ New deployment ▸ type "Web app":
//        - Execute as: Me
//        - Who has access: Anyone
//      Copy the resulting /exec URL.
//   4. Send the /exec URL + the secret to the dev; they set CASHBACK_WEBHOOK_URL
//      and CASHBACK_WEBHOOK_SECRET in js/creator-dashboard.js.
//
// NOTE: the shared secret only blocks casual/drive-by abuse — the client copy is
// public. This email is NOTIFICATION ONLY: verify the creator's actual bonus in
// the sheet before paying. The claim is also recorded in Firestore (cashbackClaims).
// ============================================================================

var RECIPIENT = 'marco@taboost.me';

// Run once from the editor to generate + store the shared secret.
function setupCashbackSecret() {
  var secret = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty('CASHBACK_SECRET', secret);
  Logger.log('CASHBACK_SECRET = ' + secret);
  return secret;
}

// Run once from the editor (Editor ▸ Run ▸ testEmail) to grant the send-email
// scope and confirm delivery. This is the step that fixes "no emails arriving":
// setupCashbackSecret() does NOT touch MailApp, so it never triggers the
// script.send_mail consent — running this does. Authorize when prompted, then
// check marco@taboost.me for the test message.
function testEmail() {
  MailApp.sendEmail(RECIPIENT, 'TABOOST cashback webhook — test', 'If you received this, the send-email permission is granted and claim emails will now work.');
  Logger.log('Test email sent to ' + RECIPIENT);
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    var expected = PropertiesService.getScriptProperties().getProperty('CASHBACK_SECRET');
    if (!expected || body.secret !== expected) {
      return ContentService.createTextOutput(JSON.stringify({ ok: false, error: 'unauthorized' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var creatorName = (body.creatorName || 'Unknown creator').toString();
    var month = (body.month || '').toString();
    var amountNum = parseFloat(('' + (body.amount || 0)).replace(/[$,]/g, '')) || 0;
    var amount = amountNum.toLocaleString('en-US');

    var subject = 'Cashback Claim: ' + creatorName + ' — $' + amount;
    var message =
      'A creator claimed their Agency Cash Bonus on live.taboost.me.\n\n' +
      'Creator:  ' + creatorName + '\n' +
      'Amount:   $' + amount + '\n' +
      'For month: ' + month + '\n' +
      'Claimed:  ' + new Date().toString() + '\n\n' +
      'NOTE: notification only — verify the actual bonus in the sheet before paying.';

    MailApp.sendEmail(RECIPIENT, subject, message);

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput('POST only');
}
