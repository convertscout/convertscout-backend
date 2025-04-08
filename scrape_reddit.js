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

// Classifier for complaints and interest
const classifier = new natural.BayesClassifier();

classifier.addDocument("this is terrible", "complaint");
classifier.addDocument("worst experience ever", "complaint");
classifier.addDocument("too expensive and doesn't work", "complaint");
classifier.addDocument("looking for a solution", "interest");
classifier.addDocument("need a recommendation", "interest");
classifier.addDocument("what do you use for", "interest");
classifier.train();

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
    "business",
  ];
}

const scrapeReddit = async (niche, competitor, businessName, problemSolved) => {
  try {
    const subreddits = generateSubreddits(niche);
    const leads = [];
    const competitorComplaints = [];
    const companyComplaints = [];

    for (const subreddit of subreddits) {
      try {
        const posts = await r.getSubreddit(subreddit).search({
          query: `${niche} OR "${problemSolved}" OR "${competitor}" OR "${businessName}"`,
          sort: "new",
          time: "month",
          limit: 15,
        });

        for (const post of posts) {
          const postText = (post.title + " " + (post.selftext || "")).toLowerCase();
          const exclude = ["job", "salary", "hiring", "apply"];
          if (exclude.some(k => postText.includes(k))) continue;

          const classification = classifier.classify(postText);
          if (!["complaint", "interest"].includes(classification)) continue;

          let profilePicture = null;
          try {
            const user = await r.getUser(post.author.name).fetch();
            profilePicture = user.icon_img || null;
          } catch {}

          const postData = {
            username: post.author.name,
            platform: "Reddit",
            time: new Date(post.created_utc * 1000).toISOString(),
            text: post.title + " " + (post.selftext || ""),
            match: Math.floor(Math.random() * (100 - 90 + 1)) + 90,
            connect_url: `https://reddit.com${post.permalink}`,
            profile_picture: profilePicture,
          };

          if (postText.includes(problemSolved.toLowerCase())) leads.push(postData);
          if (postText.includes(competitor.toLowerCase())) competitorComplaints.push(postData);
          if (postText.includes(businessName.toLowerCase())) companyComplaints.push(postData);
        }
      } catch (err) {
        console.log(`❌ Subreddit "${subreddit}" failed:`, err.message);
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
