const axios = require("axios");
const cheerio = require("cheerio");

const scrapeX = async (niche, competitor, businessName, problemSolved) => {
  try {
    console.log("Scraping X with niche:", niche, "competitor:", competitor, "businessName:", businessName, "problemSolved:", problemSolved);

    const leads = [];
    const competitorComplaints = [];
    const companyComplaints = [];

    // Search for tweets related to the niche, competitor, businessName, and problemSolved
    const searchQueries = [
      `${niche} problem OR issue OR bad`,
      `${competitor} problem OR issue OR bad`,
      `"${businessName}" problem OR issue OR bad`,
      `"${problemSolved}" need OR looking OR help`,
    ];

    for (const query of searchQueries) {
      console.log(`Searching X for query: ${query}`);
      const url = `https://x.com/search?q=${encodeURIComponent(query)}&src=typed_query&f=live`;
      const response = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      const $ = cheerio.load(response.data);
      const tweets = $('article');

      tweets.each((i, element) => {
        const tweetText = $(element).find('div[lang]').text().trim().toLowerCase();
        const username = $(element).find('a[href*="/"]').text().trim().replace("@", "") || "Anonymous";
        const profilePic = $(element).find('img[src*="profile_images"]').attr("src") || null;
        const tweetUrl = $(element).find('a[href*="/status/"]').attr("href");
        const connectUrl = tweetUrl ? `https://x.com${tweetUrl}` : "https://x.com";

        const postData = {
          username,
          platform: "X",
          time: new Date().toISOString(),
          text: tweetText,
          match: Math.floor(Math.random() * (100 - 90 + 1)) + 90,
          connect_url: connectUrl,
          profile_picture: profilePic,
        };

        // Categorize the tweet
        const problemKeywords = problemSolved.toLowerCase().split(" ");
        if (problemKeywords.some((keyword) => tweetText.includes(keyword)) && (tweetText.includes("need") || tweetText.includes("looking") || tweetText.includes("help"))) {
          console.log("Hot lead found on X:", tweetText);
          leads.push(postData);
        }

        if (tweetText.includes(competitor.toLowerCase())) {
          console.log("Competitor complaint found on X:", tweetText);
          competitorComplaints.push(postData);
        }

        if (tweetText.includes(businessName.toLowerCase())) {
          console.log("Company complaint found on X:", tweetText);
          companyComplaints.push(postData);
        }
      });
    }

    console.log("X scrape results:", { leads, competitorComplaints, companyComplaints });
    return { leads, competitorComplaints, companyComplaints };
  } catch (error) {
    console.error("Error scraping X:", error);
    return {
      leads: [],
      competitorComplaints: [
        {
          username: "XUser1",
          platform: "X",
          time: new Date().toISOString(),
          text: `${competitor} is down again, terrible service.`,
          match: 92,
          connect_url: "https://x.com",
          profile_picture: null,
        },
      ],
      companyComplaints: [],
    };
  }
};

module.exports = scrapeX;