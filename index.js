// index.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { db } = require("./firebase");
const scrapeReddit = require("./scrape_reddit");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.send("✅ Backend is live.");
});

app.post("/api/leads", async (req, res) => {
  try {
    const { businessName, niche, competitor, email, problemSolved } = req.body;

    if (!businessName || !niche || !email) {
      return res.status(400).json({ error: "Missing required fields: businessName, niche, or email." });
    }

    console.log(`📥 New lead submission from: ${email}`);
    console.log("🔍 Starting Reddit scraping...");

    const redditData = await scrapeReddit(niche, competitor, businessName, problemSolved || "");

    const leadData = {
      submittedAt: new Date().toISOString(),
      businessName,
      niche,
      competitor,
      email,
      reddit: redditData,
    };

    const docRef = await db.collection("scraped_data").add(leadData);
    console.log(`✅ Data stored with ID: ${docRef.id}`);

    return res.status(200).json({
      message: "Scraping completed successfully",
      data: redditData,
    });
  } catch (error) {
    console.error("❌ Scraping error:", error);
    return res.status(500).json({ error: "An error occurred while processing your request." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
