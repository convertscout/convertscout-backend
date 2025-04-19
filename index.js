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

// 🔥 Dynamic Fake Data Generator
const generateFakeData = ({ businessName, competitor, targetCustomer, industryKeywords, painSummary }) => {
  const usernames = ["founder42", "leanbizowner", "ops_ninja", "productjam", "nocoderx"];
  const now = Date.now();

  const keywords = industryKeywords?.split(",").map(k => k.trim()).filter(Boolean) || [];
  const primaryKeyword = keywords[0] || "client tools";
  const persona = targetCustomer || "small business owner";
  const pain = painSummary || "managing operations";

  return {
    leads: [
      {
        username: usernames[0],
        platform: "Reddit",
        time: new Date(now - 86400000).toISOString(),
        text: `Any alternatives to ${competitor}? It's too bloated for a ${persona}.`,
        match: 88,
        connect_url: "https://convertscout.netlify.app/pay-signup",
        profile_picture: null
      },
      {
        username: usernames[1],
        platform: "Reddit",
        time: new Date(now - 2 * 86400000).toISOString(),
        text: `Looking for tools to improve ${pain}. What’s everyone using?`,
        match: 91,
        connect_url: "https://convertscout.netlify.app/pay-signup",
        profile_picture: null
      },
      {
        username: usernames[2],
        platform: "Reddit",
        time: new Date(now - 3 * 86400000).toISOString(),
        text: `Tried ${businessName} for ${primaryKeyword} but felt clunky. Any modern alternatives?`,
        match: 86,
        connect_url: "https://convertscout.netlify.app/pay-signup",
        profile_picture: null
      }
    ],
    competitorComplaints: [
      {
        username: "support_rant",
        platform: "Reddit",
        time: new Date(now - 4 * 86400000).toISOString(),
        text: `${competitor} crashes every time I try to onboard a new ${persona}.`,
        match: 84,
        connect_url: "https://convertscout.netlify.app/pay-signup",
        profile_picture: null
      }
    ],
    companyComplaints: [
      {
        username: "honestfeedback101",
        platform: "Reddit",
        time: new Date(now - 5 * 86400000).toISOString(),
        text: `Used ${businessName} for a project with ${targetCustomer}s — solid UX, but needs better ${primaryKeyword}.`,
        match: 78,
        connect_url: "https://convertscout.netlify.app/pay-signup",
        profile_picture: null
      }
    ]
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

    // 💤 Disabled scraping check
    /*
    const snapshot = await leadsRef.orderBy("submittedAt", "desc").limit(1).get();
    if (!snapshot.empty) {
      const existingData = snapshot.docs[0].data();
      if (existingData.reddit && existingData.reddit.leads?.length > 0) {
        return res.status(200).json({ message: "✅ Returning cached data.", data: existingData });
      }
    }
    */

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