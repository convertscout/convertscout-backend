const express = require("express");
const cors = require("cors");
const { db } = require("./firebase");
const scrapeReddit = require("./scrape_reddit");
require("dotenv").config();

const app = express();

// ✅ Enable CORS for Netlify frontend
app.use(cors({
  origin: "https://convertscout.netlify.app", // Allow Netlify frontend
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

// ✅ POST /api/leads — Save form submissions and scrape Reddit
app.post("/api/leads", async (req, res) => {
  const {
    businessName,
    niche,
    competitor,
    email,
    problemSolved,
    targetCustomer,
    industryKeywords,
    painSummary
  } = req.body;

  console.log("🔥 POST /api/leads triggered");
  console.log("📥 Received:", req.body);

  if (!email || !businessName || !niche) {
    console.log("❌ Missing required fields");
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    const leadsRef = db.collection("users").doc(email).collection("leads");

    // ✅ Check if this user already has scraped leads
    const snapshot = await leadsRef.orderBy("submittedAt", "desc").limit(1).get();

    if (!snapshot.empty) {
      const existingData = snapshot.docs[0].data();
      if (existingData.reddit && existingData.reddit.leads?.length > 0) {
        console.log("✅ Returning existing leads without re-scraping");
        return res.status(200).json({
          message: "✅ Returning existing scraped data.",
          data: existingData,
        });
      }
    }

    // ✅ Save metadata before scraping
    const metaDoc = await leadsRef.add({
      businessName,
      niche,
      competitor,
      email,
      problemSolved: problemSolved || "",
      targetCustomer: targetCustomer || "",
      industryKeywords: industryKeywords || "",
      painSummary: painSummary || "",
      submittedAt: new Date(),
    });

    console.log("✅ Metadata saved:", metaDoc.id);

    // ✅ Scrape Reddit using expanded inputs
    const scraped = await scrapeReddit({
      niche,
      competitor,
      businessName,
      problemSolved,
      targetCustomer,
      industryKeywords,
      painSummary
    });

    await leadsRef.doc(metaDoc.id).update({
      reddit: scraped,
    });

    console.log("✅ Scraped data saved");

    return res.status(200).json({
      message: "✅ Lead submitted and scraped successfully.",
      data: {
        businessName,
        niche,
        competitor,
        email,
        problemSolved,
        targetCustomer,
        industryKeywords,
        painSummary,
        reddit: scraped,
      },
    });
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