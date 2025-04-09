const express = require("express");
const { db } = require("./firebase");
const scrapeReddit = require("./scrape_reddit"); // ✅ Add this!
require("dotenv").config();

const app = express();
app.use(express.json());

// ✅ POST /api/leads — Save form submissions and scrape
app.post("/api/leads", async (req, res) => {
  const { businessName, niche, competitor, email, problemSolved } = req.body;

  if (!email || !businessName || !niche) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    const scrapedData = await scrapeReddit(niche, competitor, businessName, problemSolved || "");

    await db.collection("users").doc(email).collection("leads").add({
      businessName,
      niche,
      competitor,
      email,
      problemSolved,
      scrapedData,
      submittedAt: new Date(),
    });

    return res.status(200).json({ message: "✅ Lead submitted and scraping complete.", scrapedData });
  } catch (error) {
    console.error("❌ Error saving lead:", error);
    return res.status(500).json({ error: "Failed to save lead." });
  }
});

// ✅ GET /api/leads/:email — Fetch saved leads
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

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});