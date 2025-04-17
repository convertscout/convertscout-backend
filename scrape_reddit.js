const snoowrap = require("snoowrap");
require("dotenv").config();

const r = new snoowrap({
  userAgent: process.env.REDDIT_USER_AGENT,
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD,
});

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

const complaintTriggers = [
  "hate", "sucks", "terrible", "worst", "not working", "cancelled", "frustrated",
  "bug", "glitch", "billing issue", "broken", "scam", "avoid", "issue", "problem",
  "doesn't work", "unreliable", "disappointed", "too expensive", "support is bad",
  "not responsive", "slow", "crashing", "left", "switched"
];

const excludedTerms = [
  "job", "salary", "hiring", "resume", "intern", "school", "nsfw", "porn", "onlyfans"
];

function classify(text) {
  const t = text.toLowerCase();
  if (complaintTriggers.some(word => t.includes(word))) return "complaint";
  if (t.includes("looking for") || t.includes("recommend") || t.includes("alternative")) return "interest";
  return null;
}

function generateQueries({ problemSolved, competitor, businessName, targetCustomer, industryKeywords, painSummary }) {
  const base = [];

  const all = [
    ...(problemSolved ? [problemSolved] : []),
    ...(targetCustomer ? [targetCustomer] : []),
    ...(painSummary ? [painSummary] : []),
    ...(industryKeywords ? industryKeywords.split(",") : []),
  ];

  all.forEach(phrase => {
    const trimmed = phrase.trim().toLowerCase();
    base.push(`looking for ${trimmed}`);
    base.push(`recommendation for ${trimmed}`);
    base.push(`suggestions for ${trimmed}`);
    base.push(`tool to solve ${trimmed}`);
  });

  if (competitor) {
    const c = competitor.toLowerCase();
    base.push(`alternatives to ${c}`);
    base.push(`issues with ${c}`);
    base.push(`frustrated with ${c}`);
    base.push(`leaving ${c}`);
  }

  if (businessName) {
    const b = businessName.toLowerCase();
    base.push(`problems with ${b}`);
    base.push(`complaints about ${b}`);
    base.push(`experience using ${b}`);
  }

  return [...new Set(base)];
}

function getSubreddits() {
  return [
    "legaltech",
    "lawfirm",
    "smallbusiness",
    "startups",
    "Entrepreneur",
    "AskReddit",
    "SaaS"
  ];
}

const scrapeReddit = async (niche, competitor, businessName, problemSolved, targetCustomer = "", industryKeywords = "", painSummary = "") => {
  const subreddits = getSubreddits();
  const queries = generateQueries({ problemSolved, competitor, businessName, targetCustomer, industryKeywords, painSummary });

  const leads = [];
  const competitorComplaints = [];
  const companyComplaints = [];

  let throttleCounter = 0;

  for (const subreddit of subreddits) {
    for (const query of queries) {
      throttleCounter++;
      if (throttleCounter % 4 === 0) await delay(800);

      try {
        const posts = await r.getSubreddit(subreddit).search({
          query,
          sort: "relevance",
          time: "year",
          limit: 12,
        });

        for (const post of posts) {
          const raw = post.title + " " + (post.selftext || "");
          const lower = raw.toLowerCase();

          if (
            excludedTerms.some(term => lower.includes(term)) ||
            raw.length < 50 ||
            post.ups < 3
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
          if (competitor && lower.includes(competitor.toLowerCase())) competitorComplaints.push(postData);
          if (businessName && lower.includes(businessName.toLowerCase())) companyComplaints.push(postData);
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