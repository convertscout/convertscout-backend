const express = require("express");
const cors = require("cors");
const { db } = require("./firebase");
// const scrapeReddit = require("./scrape_reddit");
require("dotenv").config();

const app = express();

app.use(cors({
  origin: "https://convertscout.netlify.app",
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

// 🔥 Simple, Universal Fake Data Generator
const generateFakeData = ({ businessName, competitor, targetCustomer, industryKeywords, painSummary }) => {
  const now = Date.now();
  const connect_url = "https://convertscout.netlify.app/pay-signup";

  const keywords = industryKeywords?.split(",").map(k => k.trim()).filter(Boolean) || [];
  const mainKeyword = keywords[0] || "tools";
  const persona = targetCustomer || "business owners";
  const pain = painSummary || "day-to-day struggles";

  const leads = [
    {
      username: "nocoderx",
      platform: "Reddit",
      time: new Date(now - 86400000).toISOString(),
      text: `Any alternatives to ${competitor}? It's just not cutting it for most ${persona}.`,
      match: 88,
      connect_url,
      profile_picture: null
    },
    {
      username: "growthstack",
      platform: "Reddit",
      time: new Date(now - 2 * 86400000).toISOString(),
      text: `We’re moving away from older options — anyone using newer ${mainKeyword}? Any favorites here?`,
      match: 91,
      connect_url,
      profile_picture: null
    },
    {
      username: "leanfounder101",
      platform: "Reddit",
      time: new Date(now - 3 * 86400000).toISOString(),
      text: `Trying to reduce friction in ${pain}. What solutions are people loving right now?`,
      match: 86,
      connect_url,
      profile_picture: null
    }
  ];

  const competitorComplaints = [
    {
      username: "rantengineer",
      platform: "Reddit",
      time: new Date(now - 4 * 86400000).toISOString(),
      text: `${competitor} keeps breaking during client onboarding. Super frustrating.`,
      match: 82,
      connect_url,
      profile_picture: null
    }
  ];

  const companyComplaints = [
    {
      username: "realfeedback88",
      platform: "Reddit",
      time: new Date(now - 5 * 86400000).toISOString(),
      text: `Tried ${businessName} briefly — the idea is solid, but missing depth in ${mainKeyword}.`,
      match: 76,
      connect_url,
      profile_picture: null
    }
  ];

  return {
    leads,
    competitorComplaints,
    companyComplaints
  };
};

// ✅ POST /api/leads — Save form + return fake data
app.post("/api/leads", async (req, res) => {
  const {
    businessName,
    niche,
    competitor,
    email,
    targetCustomer,
    industryKeywords,
    painSummary
  } = req.body;

  console.log("🔥 POST /api/leads triggered");
  console.log("📥 Received:", req.body);

  if (!email || !businessName || !niche) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    const leadsRef = db.collection("users").doc(email).collection("leads");

    const metaDoc = await leadsRef.add({
      businessName,
      niche,
      competitor,
      email,
      targetCustomer: targetCustomer || "",
      industryKeywords: industryKeywords || "",
      painSummary: painSummary || "",
      submittedAt: new Date(),
    });

    const reddit = generateFakeData({ businessName, competitor, targetCustomer, industryKeywords, painSummary });

    await leadsRef.doc(metaDoc.id).update({ reddit });

    return res.status(200).json({
      message: "🧪 BETA MODE — Returning dynamic fake leads.",
      data: {
        businessName,
        niche,
        competitor,
        email,
        targetCustomer,
        industryKeywords,
        painSummary,
        reddit
      }
    });
  } catch (error) {
    console.error("❌ Error saving or generating fake leads:", error);
    return res.status(500).json({ error: "Failed to process lead." });
  }
});

// ✅ GET /api/leads/:email
app.get("/api/leads/:email", async (req, res) => {
  const { email } = req.params;
  if (!email) return res.status(400).json({ error: "Email is required." });

  try {
    const leadsRef = db.collection("users").doc(email).collection("leads");
    const snapshot = await leadsRef.orderBy("submittedAt", "desc").get();

    if (snapshot.empty) {
      return res.status(200).json({ message: "No data found", data: [] });
    }

    const leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.status(200).json({ data: leads });
  } catch (error) {
    console.error("❌ Error fetching leads:", error);
    return res.status(500).json({ error: "Failed to fetch leads" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});