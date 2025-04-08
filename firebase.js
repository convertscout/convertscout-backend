const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey"); // Import local secret file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

console.log("✅ Firebase initialized from local serviceAccountKey.js");

module.exports = { db };