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
  "hate", "sucks", "terrible", "worst", "not working", "cancelled", "frustrated", "bug", "glitch",
  "billing issue", "broken", "scam", "avoid", "issue", "problem", "doesn't work", "unreliable"
];

const interestKeywords = [
  "recommendation", "looking for", "best tool", "need help", "suggestion", "how do you", "anyone use",
  "what's best", "alternatives to", "switch from", "leaving", "moving away", "crm for", "client tracking",
  "crm suggestions", "case management", "legal tech", "intake software"
];

const excludedTerms = ["job", "salary", "hiring", "resume", "applying", "college", "school", "intern"];

const delay = (ms) => new Promise(res => setTimeout(res, ms));

// Extract meaningful context tokens
function extractContextTokens(...fields) {
  return fields
    .flatMap(field => field.toLowerCase().split(/\s+/))
    .filter(token =>
      token.length > 3 &&
      !["the", "this", "that", "your", "need", "help", "with", "from", "into", "tool", "using", "organizing"].includes(token)
    );
}

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
    `${formatted}support`,
    "Entrepreneur",
    "smallbusiness",
    "legaladvice",
    "startups",
    "business",
    "AskReddit"
  ];
}

function generateQueries(niche, competitor, businessName, problemSolved) {
  return [
    `"need help with ${niche}"`,
    `"alternatives to ${competitor}"`,
    `"bad experience with ${competitor}"`,
    `"recommendation for ${niche}"`,
    `"problems with ${businessName}"`,
    `"crm issues"`,
    `"looking for crm"`,

    niche,
    competitor,
    problemSolved,
    businessName
  ];
}

const scrapeReddit = async (niche, competitor, businessName, problemSolved) => {
  try {
    const subreddits = generateSubreddits(niche);
    const queries = generateQueries(niche, competitor, businessName, problemSolved);
    const contextTokens = extractContextTokens(niche, competitor, businessName, problemSolved);

    const leads = [];
    const competitorComplaints = [];
    const companyComplaints = [];

    for (const subreddit of subreddits) {
      for (const query of queries) {
        await delay(1200); // throttle for safety

        try {
          const posts = await r.getSubreddit(subreddit).search({
            query,
            sort: "relevance",
            time: "year",
            limit: 15,
          });

          for (const post of posts) {
            const postTextRaw = post.title + " " + (post.selftext || "");
            const postText = postTextRaw.toLowerCase();

            // ⛔️ Skip low-value content
            if (
              excludedTerms.some(k => postText.includes(k)) ||
              postText.length < 60 ||
              post.ups < 5
            ) continue;

            const type = classifyText(postText);
            if (!["complaint", "interest"].includes(type)) continue;

            // ✅ Smart relevance scoring
            const tokenHits = contextTokens.filter(t => postText.includes(t)).length;
            if (tokenHits < 2) continue; // ignore weak matches

            let profilePicture = null;
            try {
              const user = await r.getUser(post.author.name).fetch();
              profilePicture = user.icon_img || null;
            } catch {}

            const postData = {
              username: post.author.name,
              platform: "Reddit",
              time: new Date(post.created_utc * 1000).toISOString(),
              text: postTextRaw,
              match: 80 + tokenHits * 5,
              connect_url: `https://reddit.com${post.permalink}`,
              profile_picture: profilePicture,
            };

            if (type === "interest") leads.push(postData);
            if (postText.includes(competitor.toLowerCase())) competitorComplaints.push(postData);
            if (postText.includes(businessName.toLowerCase())) companyComplaints.push(postData);
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