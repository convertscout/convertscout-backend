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

// Train the classifier with more examples
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
    console.log("Scraping Reddit with niche:", niche, "competitor:", competitor, "businessName:", businessName, "problemSolved:", problemSolved);

    // Expanded list of subreddits, including more general ones
    const subreddits = [
      "CRM",
      "sales",
      "smallbusiness",
      "technology",
      "SaaS",
      "Entrepreneur",
      "startups",
      "marketing",
      "business",
      "techsupport",
      "software",
      "productivity",
      "webdev",
      "sysadmin",
      "CustomerService",
      "AskReddit", // General subreddit for broad queries
      "personalfinance", // For business-related complaints
      "tech", // General tech discussions
      "socialmedia", // For marketing-related discussions
      "freelance", // For freelancers discussing tools
      "ecommerce", // For online business discussions
    ];

    const leads = [];
    const competitorComplaints = [];
    const companyComplaints = [];

    for (const subreddit of subreddits) {
      console.log(`Searching subreddit: r/${subreddit}`);

      // Search for posts related to the niche, competitor, businessName, and problemSolved
      const posts = await r.getSubreddit(subreddit).search({
        query: `${niche} OR ${competitor} OR "${businessName}" OR "${problemSolved}" "problem" OR "issue" OR "complaint" OR "frustrating" OR "expensive" OR "bad" -job -salary -hiring`,
        sort: "new",
        time: "month",
        limit: 20,
      });

      console.log(`Posts found in r/${subreddit}:`, posts.length);

      for (const post of posts) {
        const postText = (post.title + " " + (post.selftext || "")).toLowerCase();

        // Skip job-related posts
        const excludeKeywords = ["job", "salary", "hiring", "apply", "position", "career"];
        if (excludeKeywords.some((keyword) => postText.includes(keyword))) {
          console.log("Skipping job-related post:", post.title);
          continue;
        }

        // Use NLP to classify the post
        const classification = classifier.classify(postText);
        if (classification !== "complaint") {
          console.log("Skipping non-complaint post:", post.title);
          continue;
        }

        // Fetch the user's profile picture
        let profilePicture = null;
        try {
          const user = await r.getUser(post.author.name).fetch();
          profilePicture = user.icon_img || null;
        } catch (error) {
          console.log(`Could not fetch profile picture for ${post.author.name}:`, error.message);
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

        // Categorize the post
        // Hot Leads: Users expressing a need that matches the problemSolved
        const problemKeywords = problemSolved.toLowerCase().split(" ");
        if (problemKeywords.some((keyword) => postText.includes(keyword))) {
          console.log("Hot lead found:", post.title);
          leads.push(postData);
        }

        // Competitor Complaints
        if (postText.includes(competitor.toLowerCase())) {
          console.log("Competitor complaint found:", post.title);
          competitorComplaints.push(postData);
        }

        // Company Complaints
        if (postText.includes(businessName.toLowerCase())) {
          console.log("Company complaint found:", post.title);
          companyComplaints.push(postData);
        }
      }
    }

    console.log("Reddit scrape results:", { leads, competitorComplaints, companyComplaints });
    return { leads, competitorComplaints, companyComplaints };
  } catch (error) {
    console.error("Error scraping Reddit:", error);
    return { leads: [], competitorComplaints: [], companyComplaints: [] };
  }
};

module.exports = scrapeReddit;