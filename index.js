const { db } = require("./firebase"); // 🔥 FIXED: db is now correctly imported
const scrapeReddit = require("./scrape_reddit");
const scrapeG2 = require("./scrape_g2");
const scrapeCapterra = require("./scrape_capterra");
const scrapeTrustpilot = require("./scrape_trustpilot");
const scrapeX = require("./scrape_x");

const main = async () => {
  try {
    const formData = {
      businessName: "zoho", // Example, will be provided by user
      niche: "crm",
      competitor: "HubSpot",
      problemSolved: "streamline customer management", // Example, will be provided by user
    };

    const { businessName, niche, competitor, problemSolved } = formData;

    console.log("🔄 Running scrapers...");
    
    // Run all scrapers
    const redditData = await scrapeReddit(niche, competitor, businessName, problemSolved);
    const g2Data = await scrapeG2(niche, competitor, businessName, problemSolved);
    const capterraData = await scrapeCapterra(niche, competitor, businessName, problemSolved);
    const trustpilotData = await scrapeTrustpilot(niche, competitor, businessName, problemSolved);
    const xData = await scrapeX(niche, competitor, businessName, problemSolved);

    console.log("✅ Scraping completed!");

    // Combine data
    const combinedData = {
      leads: [
        ...(redditData.leads || []),
        ...(g2Data.leads || []),
        ...(capterraData.leads || []),
        ...(trustpilotData.leads || []),
        ...(xData.leads || []),
      ],
      competitor_complaints: [
        ...(redditData.competitorComplaints || []),
        ...(g2Data.competitorComplaints || []),
        ...(capterraData.competitorComplaints || []),
        ...(trustpilotData.competitorComplaints || []),
        ...(xData.competitorComplaints || []),
      ],
      company_complaints: [
        ...(redditData.companyComplaints || []),
        ...(g2Data.companyComplaints || []),
        ...(capterraData.companyComplaints || []),
        ...(trustpilotData.companyComplaints || []),
        ...(xData.companyComplaints || []),
      ],
    };

    // Store in Firestore using Admin SDK
    console.log("📤 Storing data in Firestore...");
    await db.collection("scraped_data").doc("latest").set(combinedData);
    console.log("✅ Data stored successfully in Firestore!");
  } catch (error) {
    console.error("❌ Error in main:", error);
  }
};

main();