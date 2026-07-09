/**
 * Midwest Diamond Buyers — Form Backend (EXISTING SCRIPT)
 * ---------------------------------------------------------
 * This is your existing Google Apps Script — the one already bound
 * to your Google Sheet, with a "Contacts" tab and a "Selling_Item"
 * tab, and a Google Drive folder (FOLDER_ID below) for uploaded
 * item photos. It was already working before the site rebuild;
 * the site's forms just weren't calling it. This copy is kept here
 * only as a reference/backup of what's deployed.
 *
 * assets/form-handler.js on the website is now written to match
 * this script's exact expected input:
 *   - "Inquiry Details" forms (.gSheetForm) send form_type,
 *     fullName, email, phone, preferredContact, assets as
 *     x-www-form-urlencoded, matching e.parameter here.
 *   - The diamond/watch/jewelry evaluation form (#dynamic-intake)
 *     sends JSON shaped as { contact: {...}, intake: {...} }
 *     matching payload.contact / payload.intake here.
 *
 * If you ever need to redeploy: Extensions -> Apps Script -> Deploy
 * -> Manage deployments -> edit -> New version. Redeploying gives
 * the SAME URL, so nothing in form-handler.js needs to change.
 * If you create a brand new deployment instead, you'll get a new
 * URL and will need to update APPS_SCRIPT_URL in form-handler.js.
 * ---------------------------------------------------------
 */

const FOLDER_ID = "17FJysB6UoBpJ0oXJPH9q92HUCSivdAlK";
const NOTIFY_EMAIL = "salbertdiamonds@gmail.com";

function doPost(e) {
  try {
    const doc = SpreadsheetApp.getActiveSpreadsheet();

    // SCENARIO 1: The standard "Contact Us" form (from the Contact Page)
    if (e.parameter && e.parameter.form_type === 'contact_us') {
      const sheet = doc.getSheetByName('Contacts');
      const date = new Date();
      sheet.appendRow([
        date,
        e.parameter.fullName,
        e.parameter.email,
        e.parameter.phone,
        e.parameter.preferredContact,
        e.parameter.assets,
        "No image attached"
      ]);

      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        subject: "New Contact Form Submission",
        body:
          "New Contact Submission:\n\n" +
          "Name: " + e.parameter.fullName + "\n" +
          "Email: " + e.parameter.email + "\n" +
          "Phone: " + e.parameter.phone + "\n" +
          "Preferred Contact: " + e.parameter.preferredContact + "\n" +
          "Assets: " + e.parameter.assets + "\n\n" +
          "Submitted: " + new Date()
      });

      return ContentService.createTextOutput(JSON.stringify({ "result": "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    // SCENARIO 2: The Two-Part Evaluation Form (goes to 'Selling_Item' tab)
    if (e.postData && e.postData.contents) {
      const payload = JSON.parse(e.postData.contents);
      const sheet = doc.getSheetByName('Selling_Item');
      const date = new Date();
      let imageUrl = "No image attached";

      if (payload.intake && payload.intake.imageBase64) {
        const folder = DriveApp.getFolderById(FOLDER_ID);
        const blob = Utilities.newBlob(
          Utilities.base64Decode(payload.intake.imageBase64),
          payload.intake.imageMimeType,
          payload.intake.imageName
        );
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        imageUrl = file.getUrl();
      }

      let itemDetailsStr = "";
      if (payload.intake) {
        itemDetailsStr += "CATEGORY: " + payload.intake.intakeTitle + "\n\n";
        for (const [question, answer] of Object.entries(payload.intake.fields)) {
          itemDetailsStr += question + ": " + answer + "\n";
        }
      } else {
        itemDetailsStr = "No item details provided.";
      }

      sheet.appendRow([
        date,
        payload.contact.fullName,
        payload.contact.email,
        payload.contact.phone,
        payload.contact.preferredContact,
        itemDetailsStr,
        imageUrl
      ]);

      MailApp.sendEmail({
        to: NOTIFY_EMAIL,
        subject: "New Item Evaluation Submission",
        body:
          "New Selling Item Submission:\n\n" +
          "Name: " + payload.contact.fullName + "\n" +
          "Email: " + payload.contact.email + "\n" +
          "Phone: " + payload.contact.phone + "\n" +
          "Preferred Contact: " + payload.contact.preferredContact + "\n\n" +
          "ITEM DETAILS:\n\n" +
          itemDetailsStr + "\n\n" +
          "Image URL: " + imageUrl + "\n\n" +
          "Submitted: " + new Date()
      });

      return ContentService.createTextOutput(JSON.stringify({ "result": "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": "Unknown payload type" })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "error": error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function forcePermission() {
  const quota = MailApp.getRemainingDailyQuota();
  console.log("Mail permission granted" + quota + "emails");
}
