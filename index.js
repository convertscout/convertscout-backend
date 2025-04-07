// index.js
const { db } = require("./firebase");
const scrapeReddit = require("./scrape_reddit");

const main = async () => {
  try {
    const formData = {
      businessName: "zoho",
      niche: "crm",
      competitor: "HubSpot",
      problemSolved: "streamline customer management",
    };

    const { businessName, niche, competitor, problemSolved } = formData;

    console.log("🔄 Running Reddit scraper...");

    const redditData = await scrapeReddit(niche, competitor, businessName, problemSolved);

    console.log("✅ Scraping completed!");

    const combinedData = {
      leads: redditData.leads,
      competitor_complaints: redditData.competitorComplaints,
      company_complaints: redditData.companyComplaints,
    };

    console.log("📤 Storing data in Firestore...");
    await db.collection("scraped_data").doc("latest").set(combinedData);
    console.log("✅ Data stored successfully!");
  } catch (error) {
    console.error("❌ Error in main:", error);
  }
};

main();
