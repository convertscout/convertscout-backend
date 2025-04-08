const snoowrap = require("snoowrap");
require("dotenv").config();

const r = new snoowrap({
  userAgent: process.env.REDDIT_USER_AGENT,
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD,
});

const complaintKeywords = [
  "hate", "sucks", "terrible", "worst", "not working",
  "cancelled", "frustrated", "bug", "glitch", "billing issue",
  "broken", "scam", "avoid", "issue", "problem", "doesn't work"
];

const interestKeywords = [
  "recommendation", "looking for", "best tool", "need help",
  "suggestion", "how do you", "anyone use", "what's best",
  "alternatives to", "switch from", "leaving", "moving away"
];

function classifyText(text) {
  const lowered = text.toLowerCase();
  if (complaintKeywords.some(k => lowered.includes(k))) return "complaint";
  if (interestKeywords.some(k => lowered.includes(k))) return "interest";
  return null;
}

function generateSubreddits(niche) {
  const formatted = niche.replace(/\s+/g, "").toLowerCase();
  return [
    formatted,
    `${formatted}business`,
    `${formatted}support`,
    "AskReddit",
    "Entrepreneur",
    "smallbusiness",
    "Advice",
    "recommendations",
    "startup",
    "business"
  ];
}

function generateQueries(niche, competitor, businessName, problemSolved) {
  return [
    `"need help with ${niche}"`,
    `"struggling with ${problemSolved}"`,
    `"alternatives to ${competitor}"`,
    `"issues with ${competitor}"`,
    `"bad experience with ${competitor}"`,
    `"recommendation for ${niche}"`,
    `"problems with ${businessName}"`,
    `"hate using ${competitor}"`,
    `"frustrated with ${problemSolved}"`,
    `"switching from ${competitor}"`,
    `${niche}`,
    `${problemSolved}`,
    `${competitor}`,
    `${businessName}`
  ];
}

const scrapeReddit = async (niche, competitor, businessName, problemSolved) => {
  try {
    const subreddits = generateSubreddits(niche);
    const queries = generateQueries(niche, competitor, businessName, problemSolved);

    const leads = [];
    const competitorComplaints = [];
    const companyComplaints = [];

    for (const subreddit of subreddits) {
      for (const query of queries) {
        try {
          const posts = await r.getSubreddit(subreddit).search({
            query,
            sort: "relevance",
            time: "year",
            limit: 50,
          });

          for (const post of posts) {
            const postText = (post.title + " " + (post.selftext || "")).toLowerCase();
            const exclude = ["job", "salary", "hiring", "apply"];
            if (exclude.some(k => postText.includes(k))) continue;

            const classification = classifyText(postText);
            if (!["complaint", "interest"].includes(classification)) continue;

            let profilePicture = null;
            try {
              const user = await r.getUser(post.author.name).fetch();
              profilePicture = user.icon_img || null;
            } catch {}

            const relevanceBoost = [
              postText.includes(problemSolved.toLowerCase()),
              postText.includes(competitor.toLowerCase()),
              postText.includes(businessName.toLowerCase())
            ].filter(Boolean).length;

            const postData = {
              username: post.author.name,
              platform: "Reddit",
              time: new Date(post.created_utc * 1000).toISOString(),
              text: post.title + " " + (post.selftext || ""),
              match: 85 + relevanceBoost * 5,
              connect_url: `https://reddit.com${post.permalink}`,
              profile_picture: profilePicture,
            };

            if (postText.includes(problemSolved.toLowerCase()) || classification === "interest") {
              leads.push(postData);
            }

            if (postText.includes(competitor.toLowerCase()) || query.includes(competitor.toLowerCase())) {
              competitorComplaints.push(postData);
            }

            if (postText.includes(businessName.toLowerCase())) {
              companyComplaints.push(postData);
            }
          }
        } catch (err) {
          console.log(`❌ Query "${query}" on subreddit "${subreddit}" failed:`, err.message);
        }
      }
    }

    return {
      leads: leads.slice(0, 3),
      competitorComplaints: competitorComplaints.slice(0, 3),
      companyComplaints: companyComplaints.slice(0, 3),
    };
  } catch (error) {
    console.error("❌ Reddit scraping error:", error);
    return { leads: [], competitorComplaints: [], companyComplaints: [] };
  }
};

module.exports = scrapeReddit;