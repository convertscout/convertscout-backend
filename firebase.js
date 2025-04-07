// firebase.js
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

let serviceAccount;

if (process.env.FIREBASE_ADMIN_SDK) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK);
    console.log("🔐 Firebase loaded from environment variable.");
  } catch (err) {
    console.error("❌ Invalid FIREBASE_ADMIN_SDK in .env", err);
    process.exit(1);
  }
} else {
  try {
    const keyPath = path.resolve(__dirname, "serviceAccountKey.json");
    serviceAccount = require(keyPath);
    console.log("🔐 Firebase loaded from local serviceAccountKey.json.");
  } catch (err) {
    console.error("❌ Firebase service account JSON missing!", err);
    process.exit(1);
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

console.log("✅ Firebase connected successfully!");

module.exports = { db };