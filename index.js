const express = require("express");
const { db } = require("./firebase");
const scrapeReddit = require("./scrape_reddit");
require("dotenv").config();

const app = express();
app.use(express.json());

// ✅ POST /api/leads — Save form submissions and scrape Reddit
app.post("/api/leads", async (req, res) => {
  const { businessName, niche, competitor, email, problemSolved } = req.body;

  if (!email || !businessName || !niche) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    const leadsRef = db.collection("users").doc(email).collection("leads");

    // 1. Save metadata first (without scraped data)
    const metaDoc = await leadsRef.add({
      businessName,
      niche,
      competitor,
      email,
      problemSolved: problemSolved || "",
      submittedAt: new Date(),
    });

    // 2. Trigger scraping
    const scraped = await scrapeReddit(niche, competitor, businessName, problemSolved);

    // 3. Save the scraped data under that submission
    await leadsRef.doc(metaDoc.id).update({
      reddit: scraped,
    });

    return res.status(200).json({ message: "✅ Lead submitted and scraped successfully." });
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