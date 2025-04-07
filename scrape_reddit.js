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

classifier.addDocument("this is terrible", "complaint");
classifier.addDocument("i hate this", "complaint");
classifier.addDocument("such a bad experience", "complaint");
classifier.addDocument("this is slow and frustrating", "complaint");
classifier.addDocument("worst crm ever", "complaint");
classifier.addDocument("too expensive", "complaint");
classifier.addDocument("keeps crashing", "complaint");
classifier.addDocument("great product", "non-complaint");
classifier.addDocument("i love this", "non-complaint");
classifier.addDocument("awesome experience", "non-complaint");
classifier.addDocument("works perfectly", "non-complaint");
classifier.train();

const scrapeReddit = async (niche, competitor, businessName, problemSolved) => {
  try {
    const subreddits = [
      "CRM", "sales", "smallbusiness", "technology", "SaaS", "Entrepreneur",
      "startups", "marketing", "business", "techsupport", "software",
      "productivity", "webdev", "sysadmin", "CustomerService", "AskReddit",
      "personalfinance", "tech", "socialmedia", "freelance", "ecommerce",
    ];

    const leads = [];
    const competitorComplaints = [];
    const companyComplaints = [];

    for (const subreddit of subreddits) {
      const posts = await r.getSubreddit(subreddit).search({
        query: `${niche} OR ${competitor} OR "${businessName}" OR "${problemSolved}" "problem" OR "issue" OR "complaint" OR "frustrating" OR "expensive" OR "bad" -job -salary -hiring`,
        sort: "new",
        time: "month",
        limit: 15,
      });

      for (const post of posts) {
        const postText = (post.title + " " + (post.selftext || "")).toLowerCase();

        const excludeKeywords = ["job", "salary", "hiring", "apply", "position", "career"];
        if (excludeKeywords.some((keyword) => postText.includes(keyword))) continue;

        const classification = classifier.classify(postText);
        if (classification !== "complaint") continue;

        let profilePicture = null;
        try {
          const user = await r.getUser(post.author.name).fetch();
          profilePicture = user.icon_img || null;
        } catch (error) {
          console.log(`Failed fetching avatar for ${post.author.name}`);
        }

        const postData = {
          username: post.author.name,
          platform: "Reddit",
          time: new Date(post.created_utc * 1000).toISOString(),
          text: post.title + " " + (post.selftext || ""),
          match: Math.floor(Math.random() * (100 - 90 + 1)) + 90,
          connect_url: `https://reddit.com${post.permalink}`,
          profile_picture: profilePicture,
        };

        const problemKeywords = problemSolved.toLowerCase().split(" ");
        if (problemKeywords.some((kw) => postText.includes(kw))) leads.push(postData);
        if (postText.includes(competitor.toLowerCase())) competitorComplaints.push(postData);
        if (postText.includes(businessName.toLowerCase())) companyComplaints.push(postData);
      }
    }

    // Return only top 3 per section
    return {
      leads: leads.slice(0, 3),
      competitorComplaints: competitorComplaints.slice(0, 3),
      companyComplaints: companyComplaints.slice(0, 3),
    };
  } catch (error) {
    console.error("Reddit scraping failed:", error);
    return { leads: [], competitorComplaints: [], companyComplaints: [] };
  }
};

module.exports = scrapeReddit;
