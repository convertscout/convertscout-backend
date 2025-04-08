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

// POST /api/leads - receives user input, scrapes Reddit, stores in Firestore
app.post("/api/leads", async (req, res) => {
  try {
    const { businessName, niche, competitor, email } = req.body;

    if (!businessName || !niche || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    console.log(`📥 New submission from: ${email}`);
    console.log("🔄 Running Reddit scraper...");

    const redditData = await scrapeReddit(niche, competitor, businessName, niche);
    console.log("✅ Scraping completed!");

    const leadData = {
      submittedAt: new Date().toISOString(),
      businessName,
      niche,
      competitor,
      email,
      reddit: {
        leads: redditData.leads,
        competitor_complaints: redditData.competitorComplaints,
        company_complaints: redditData.companyComplaints,
      },
    };

    // Save under auto-generated ID to avoid overwrite
    const docRef = await db.collection("scraped_data").add(leadData);
    console.log(`📤 Data stored with ID: ${docRef.id}`);

    return res.status(200).json({ message: "Scraping done", data: leadData.reddit });
  } catch (error) {
    console.error("❌ Error during scrape:", error);
    return res.status(500).json({ error: "Something went wrong during scraping." });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});