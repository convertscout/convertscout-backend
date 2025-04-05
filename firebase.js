require("dotenv").config();
const admin = require("firebase-admin");

if (!process.env.FIREBASE_ADMIN_SDK) {
  throw new Error("⚠️ ERROR: FIREBASE_ADMIN_SDK is missing in .env file!");
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK.replace(/\n/g, "\\n"));
} catch (error) {
  console.error("❌ ERROR: Invalid JSON in FIREBASE_ADMIN_SDK", error);
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore(); // 🔥 FIXED: Explicitly create Firestore instance

console.log("✅ Firebase connected successfully!");

module.exports = { db }; // 🔥 FIXED: Export db instead of admin