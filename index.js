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

// 🔥 Helper to generate realistic fake leads
const generateFakeData = ({ businessName, competitor, targetCustomer }) => {
  const sampleUsernames = ["smb_guru", "founder42", "tiredofcrm", "leanbizowner", "growthops"];
  const sampleLeads = [
    {
      text: `Any alternatives to ${competitor}? It's too complex for my team.`,
      match: 89
    },
    {
      text: `What are you using to manage client work? Looking for something simpler.`,
      match: 91
    },
    {
      text: `Need help organizing client workflows. ${businessName} doesn't fit my use case.`,
      match: 86
    }
  ];

  const now = Date.now();
  return {
    leads: sampleLeads.map((lead, i) => ({
      username: sampleUsernames[i % sampleUsernames.length],
      platform: "Reddit",
      time: new Date(now - i * 86400000).toISOString(),
      text: lead.text,
      match: lead.match,
      connect_url: "https://reddit.com/r/Entrepreneur",
      profile_picture: null
    })),
    competitorComplaints: [
      {
        username: "techstruggles",
        platform: "Reddit",
        time: new Date(now - 2 * 86400000).toISOString(),
        text: `${competitor} keeps crashing when I try to update contact info.`,
        match: 84,
        connect_url: "https://reddit.com/r/smallbusiness",
        profile_picture: null
      }
    ],
    companyComplaints: [
      {
        username: "legaltechfan",
        platform: "Reddit",
        time: new Date(now - 3 * 86400000).toISOString(),
        text: `Used ${businessName} for a month — great idea but missing key features for ${targetCustomer}.`,
        match: 77,
        connect_url: "https://reddit.com/r/startups",
        profile_picture: null
      }
    ]
  };
};

// ✅ POST /api/leads — Save form and return FAKE data
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
    console.log("❌ Missing required fields");
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    const leadsRef = db.collection("users").doc(email).collection("leads");

    // 💤 Disabled: check existing data
    /*
    const snapshot = await leadsRef.orderBy("submittedAt", "desc").limit(1).get();
    if (!snapshot.empty) {
      const existingData = snapshot.docs[0].data();
      if (existingData.reddit && existingData.reddit.leads?.length > 0) {
        return res.status(200).json({
          message: "✅ Returning existing scraped data.",
          data: existingData,
        });
      }
    }
    */

    // ✅ Save metadata only
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

    console.log("✅ Metadata saved:", metaDoc.id);

    // 🧪 Generate fake personalized data
    const fakeRedditData = generateFakeData({ businessName, competitor, targetCustomer });

    await leadsRef.doc(metaDoc.id).update({
      reddit: fakeRedditData
    });

    return res.status(200).json({
      message: "🧪 BETA MODE — Returning fake personalized leads.",
      data: {
        businessName,
        niche,
        competitor,
        email,
        targetCustomer,
        industryKeywords,
        painSummary,
        reddit: fakeRedditData
      }
    });
  } catch (error) {
    console.error("❌ Error saving or faking lead:", error);
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});