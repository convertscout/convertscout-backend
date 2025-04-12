const express = require("express");
const { db } = require("./firebase");
const scrapeReddit = require("./scrape_reddit");
require("dotenv").config();

const app = express();
app.use(express.json());

// ✅ POST /api/leads — Save form submissions and scrape Reddit
app.post("/api/leads", async (req, res) => {
  const { businessName, niche, competitor, email, problemSolved } = req.body;

  if (!email || !businessName || !niche || !problemSolved) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    const userRef = db.collection("users").doc(email);
    const leadsRef = userRef.collection("leads");

    // ✅ Step 1: Check if leads already exist
    const existingSnapshot = await leadsRef.orderBy("submittedAt", "desc").limit(1).get();
    if (!existingSnapshot.empty) {
      console.log("📦 Found existing data. Skipping scrape.");
      return res.status(200).json({ message: "✅ User already exists. No need to scrape again." });
    }

    // ✅ Step 2: Save lead meta first
    const metaDoc = await leadsRef.add({
      businessName,
      niche,
      competitor,
      email,
      problemSolved,
      submittedAt: new Date(),
    });

    // ✅ Step 3: Scrape Reddit
    const redditResults = await scrapeReddit(niche, competitor, businessName, problemSolved);

    // ✅ Step 4: Update the doc with scraped results
    await leadsRef.doc(metaDoc.id).update({
      reddit: redditResults,
    });

    return res.status(200).json({ message: "✅ New user scraped and data saved." });
  } catch (error) {
    console.error("❌ Error saving or scraping lead:", error);
    return res.status(500).json({ error: "Failed to process lead." });
  }
});

// ✅ GET /api/leads/:email — Fetch leads for user
app.get("/api/leads/:email", async (req, res) => {
  const { email } = req.params;
  if (!email) return res.status(400).json({ error: "Email is required." });

  try {
    const leadsRef = db.collection("users").doc(email).collection("leads");
    const snapshot = await leadsRef.orderBy("submittedAt", "desc").get();

    if (snapshot.empty) {
      return res.status(200).json({ message: "No data found", data: [] });
    }

    const leads = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({ data: leads });
  } catch (error) {
    console.error("❌ Error fetching leads:", error);
    return res.status(500).json({ error: "Failed to fetch leads" });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});