const snoowrap = require("snoowrap");
require("dotenv").config();

const r = new snoowrap({
  userAgent: process.env.REDDIT_USER_AGENT,
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD,
});

const delay = (ms) => new Promise(res => setTimeout(res, ms));

const complaintTriggers = [
  "hate", "sucks", "terrible", "worst", "not working", "cancelled", "frustrated", "bug", "glitch",
  "billing issue", "broken", "scam", "avoid", "issue", "problem", "doesn't work", "unreliable",
  "disappointed", "too expensive", "support is bad", "not responsive", "slow", "crashing"
];

const excludeTerms = [
  "job", "salary", "hiring", "resume", "intern", "school", "nsfw", "porn", "onlyfans"
];

// 🔍 Full sentence intent-based queries
function generateQueries(problemSolved, competitor, businessName) {
  const queries = [];

  if (problemSolved) {
    queries.push(
      `"looking for ${problemSolved}"`,
      `"recommendation for ${problemSolved}"`,
      `"any tools for ${problemSolved}"`,
      `"suggestions for ${problemSolved}"`,
      `"alternatives for ${problemSolved}"`
    );
  }

  if (competitor) {
    queries.push(
      `"alternatives to ${competitor}"`,
      `"bad experience with ${competitor}"`,
      `"issues with ${competitor}"`,
      `"leaving ${competitor}"`
    );
  }

  if (businessName) {
    queries.push(
      `"issues with ${businessName}"`,
      `"problem using ${businessName}"`,
      `"unhappy with ${businessName}"`,
      `"bug in ${businessName}"`
    );
  }

  return queries;
}

// Targeted subreddits
function getSubreddits(problemSolved) {
  const keyword = problemSolved.split(" ")[0].toLowerCase();
  return [
    keyword,
    `${keyword}support`,
    "Entrepreneur",
    "smallbusiness",
    "startups",
    "business",
    "AskReddit",
    "saas"
  ];
}

// Classify post
function classify(text) {
  const lower = text.toLowerCase();
  if (complaintTriggers.some(word => lower.includes(word))) return "complaint";
  if (lower.includes("looking for") || lower.includes("recommend") || lower.includes("alternative")) return "interest";
  return null;
}

const scrapeReddit = async (niche, competitor, businessName, problemSolved) => {
  const subreddits = getSubreddits(problemSolved);
  const queries = generateQueries(problemSolved, competitor, businessName);

  const leads = [];
  const competitorComplaints = [];
  const companyComplaints = [];

  for (const subreddit of subreddits) {
    for (const query of queries) {
      await delay(1200); // Respect Reddit API limits

      try {
        const posts = await r.getSubreddit(subreddit).search({
          query,
          sort: "relevance",
          time: "year",
          limit: 15,
        });

        for (const post of posts) {
          const raw = post.title + " " + (post.selftext || "");
          const lower = raw.toLowerCase();

          if (
            excludeTerms.some(term => lower.includes(term)) ||
            raw.length < 80 ||
            post.ups < 5
          ) continue;

          const type = classify(lower);
          if (!type) continue;

          let profilePicture = null;
          try {
            const user = await r.getUser(post.author.name).fetch();
            profilePicture = user.icon_img || null;
          } catch {}

          const postData = {
            username: post.author.name,
            platform: "Reddit",
            time: new Date(post.created_utc * 1000).toISOString(),
            text: raw,
            match: post.ups,
            connect_url: `https://reddit.com${post.permalink}`,
            profile_picture: profilePicture,
          };

          if (type === "interest") leads.push(postData);
          if (lower.includes(competitor.toLowerCase())) competitorComplaints.push(postData);
          if (lower.includes(businessName.toLowerCase())) companyComplaints.push(postData);
        }
      } catch (err) {
        console.log(`❌ Query "${query}" on r/${subreddit} failed:`, err.message);
      }
    }
  }

  return {
    leads: leads.slice(0, 3),
    competitorComplaints: competitorComplaints.slice(0, 3),
    companyComplaints: companyComplaints.slice(0, 3),
  };
};

module.exports = scrapeReddit;