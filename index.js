const express = require("express");
const { db } = require("./firebase");
require("dotenv").config();

const app = express();
app.use(express.json());

// ✅ POST /api/leads — Save form submissions
app.post("/api/leads", async (req, res) => {
  const { businessName, niche, competitor, email, problemSolved } = req.body;

  if (!email || !businessName || !niche) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  try {
    const leadsRef = db.collection("users").doc(email).collection("leads");

    await leadsRef.add({
      businessName,
      niche,
      competitor,
      email,
      problemSolved: problemSolved || "",
      submittedAt: new Date(),
    });

    return res.status(200).json({ message: "✅ Lead submitted successfully." });
  } catch (error) {
    console.error("❌ Error saving lead:", error);
    return res.status(500).json({ error: "Failed to save lead." });
  }
});

// ✅ GET /api/leads/:email — Fetch leads for logged-in user
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