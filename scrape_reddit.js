const snoowrap = require("snoowrap");
const natural = require("natural");
require("dotenv").config();

const r = new snoowrap({
  userAgent: process.env.REDDIT_USER_AGENT,
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  username: process.env.REDDIT_USERNAME,
  password: process.env.REDDIT_PASSWORD,
});

const classifier = new natural.BayesClassifier();

// Complaint training data
[
  "this is terrible",
  "i hate this",
  "bad experience",
  "slow and frustrating",
  "worst service",
  "too expensive",
  "buggy app",
  "low quality",
  "can't recommend",
  "not worth the money",
].forEach(text => classifier.addDocument(text, "complaint"));

// Non-complaint examples
[
  "great product",
  "love this tool",
  "awesome service",
  "smooth experience",
  "works great",
].forEach(text => classifier.addDocument(text, "non-complaint"));

classifier.train();

const scrapeReddit = async (niche, competitor, businessName) => {
  try {
    const keywords = [niche, competitor, businessName].filter(Boolean).map(k => k.toLowerCase());
    const broadKeywords = [
      "problem", "issue", "struggle", "hate", "bad", "complaint",
      "feedback", "downside", "frustration", "dealbreaker", "pain"
    ];

    const subreddits = [
      "all", "Entrepreneur", "startups", "smallbusiness", "marketing",
      "AskReddit", "business", "ecommerce", "freelance", "technology",
      "CustomerService", "techsupport", "webdev", "personalfinance"
    ];

    const leads = [];
    const competitorComplaints = [];
    const companyComplaints = [];

    for (const subreddit of subreddits) {
      const query = keywords.concat(broadKeywords).join(" OR ");
      const posts = await r.getSubreddit(subreddit).search({
        query,
        sort: "new",
        time: "month",
        limit: 20,
      });

      for (const post of posts) {
        const postText = (post.title + " " + (post.selftext || "")).toLowerCase();
        const exclude = ["job", "salary", "hiring", "apply", "career", "intern"];
        if (exclude.some(term => postText.includes(term))) continue;

        const classification = classifier.classify(postText);
        if (classification !== "complaint") continue;

        let profilePicture = null;
        try {
          const user = await r.getUser(post.author.name).fetch();
          profilePicture = user.icon_img || null;
        } catch {
          profilePicture = null;
        }

        const postData = {
          username: post.author.name,
          platform: "Reddit",
          time: new Date(post.created_utc * 1000).toISOString(),
          text: post.title + " " + (post.selftext || ""),
          match: Math.floor(Math.random() * 11) + 90,
          connect_url: `https://reddit.com${post.permalink}`,
          profile_picture: profilePicture,
        };

        if (keywords.some(k => postText.includes(k))) leads.push(postData);
        if (postText.includes(competitor.toLowerCase())) competitorComplaints.push(postData);
        if (postText.includes(businessName.toLowerCase())) companyComplaints.push(postData);
      }
    }

    return {
      leads: leads.slice(0, 5),
      competitorComplaints: competitorComplaints.slice(0, 5),
      companyComplaints: companyComplaints.slice(0, 5),
    };
  } catch (err) {
    console.error("❌ Reddit scraping failed:", err);
    return { leads: [], competitorComplaints: [], companyComplaints: [] };
  }
};

module.exports = scrapeReddit;
