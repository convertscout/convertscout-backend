import praw
import time
import json
from datetime import datetime

# Reddit API credentials
CLIENT_ID = "pUOCN3qZMewQhvtpuZo18w"
CLIENT_SECRET = "hDK6G7aclnN9ViDSIBtpHWHdlODRbg"
USERNAME = "EntrepreneurEdge"
PASSWORD = "Sasukekun@995835"
USER_AGENT = "ConvertScoutBot/1.0 by EntrepreneurEdge"

# Business details
TARGET_KEYWORD = "CRM"  # For leads
COMPETITORS = ["Salesforce"]  # For competitor complaints
COMPANY_NAME = "Hubspot"  # For complaints about your company

# Initialize PRAW
reddit = praw.Reddit(
    client_id=CLIENT_ID,
    client_secret=CLIENT_SECRET,
    username=USERNAME,
    password=PASSWORD,
    user_agent=USER_AGENT
)

# Function to check if a post/comment contains negative sentiment
def has_negative_sentiment(text):
    negative_keywords = [
        "lag", "slow", "buggy", "expensive", "overpriced", "terrible",
        "horrible", "frustrating", "bad", "issue", "problem", "delay",
        "sucks", "awful", "poor", "disappointing", "crap", "nightmare",
        "annoying", "useless", "broken", "clunky", "mess", "predatory",
        "unreliable", "confusing", "overhyped", "ridiculous", "waste",
        "scam", "disaster", "pathetic", "lame", "stupid", "dumb",
        "unintuitive", "bloated", "glitchy", "unresponsive", "trash"
    ]
    return any(keyword in text.lower() for keyword in negative_keywords)

# Function to fetch posts/comments from a subreddit
def fetch_reddit_data(query, limit, subreddits, require_negative_sentiment=False):
    results = []
    for subreddit_name in subreddits:
        try:
            subreddit = reddit.subreddit(subreddit_name)
            # Search for posts
            for submission in subreddit.search(query, limit=limit * 3):  # Fetch more to filter
                text = submission.title + " " + submission.selftext
                if require_negative_sentiment and not has_negative_sentiment(text):
                    continue
                results.append({
                    "username": submission.author.name if submission.author else "anonymous",
                    "platform": "Reddit",
                    "text": text,
                    "time": datetime.fromtimestamp(submission.created_utc).isoformat(),
                    "match": 90 + (len(results) * 2),  # Simulated match score (90–98%)
                    "connect_url": f"https://www.reddit.com{submission.permalink}"  # Post URL
                })
            # Search for comments
            for submission in subreddit.new(limit=15):  # Check more recent posts for comments
                submission.comments.replace_more(limit=0)
                for comment in submission.comments.list():
                    if query.lower() in comment.body.lower():
                        if require_negative_sentiment and not has_negative_sentiment(comment.body):
                            continue
                        results.append({
                            "username": comment.author.name if comment.author else "anonymous",
                            "platform": "Reddit",
                            "text": comment.body,
                            "time": datetime.fromtimestamp(comment.created_utc).isoformat(),
                            "match": 90 + (len(results) * 2),  # Simulated match score
                            "connect_url": f"https://www.reddit.com{comment.permalink}"  # Comment URL
                        })
        except Exception as e:
            print(f"Error fetching data from r/{subreddit_name}: {e}")
        if len(results) >= limit:
            break
    return results[:limit]

# Fetch data
def scrape_reddit_data():
    data = {
        "leads": [],
        "competitor_complaints": [],
        "company_complaints": []
    }

    # Subreddits to search (expanded list relevant to CRM, sales, tech, and more)
    subreddits = [
        "smallbusiness", "entrepreneur", "startups", "sales", "CRM",
        "SaaS", "marketing", "technology", "business", "techsupport",
        "sysadmin", "webdev", "programming", "software", "productivity",
        "growthhacking", "digitalmarketing", "B2B", "ecommerce", "freelance",
        "ITManagers", "smallbiz", "marketingstrategy", "businessowners", "tech"
    ]

    # Fetch leads (5 posts/comments, no negative sentiment required)
    print("Fetching leads from Reddit...")
    leads_query = TARGET_KEYWORD
    data["leads"] = fetch_reddit_data(leads_query, 5, subreddits, require_negative_sentiment=False)
    time.sleep(5)  # Delay to avoid rate limits

    # Fetch competitor complaints (2 posts/comments total, require negative sentiment)
    print("Fetching competitor complaints from Reddit...")
    competitor_complaints = []
    for competitor in COMPETITORS:
        complaint_query = f"{competitor} lag OR slow OR buggy OR expensive OR overpriced OR terrible OR horrible OR frustrating OR bad OR issue OR problem OR delay OR sucks OR awful OR poor OR disappointing OR crap OR nightmare OR annoying OR useless OR broken OR clunky OR mess OR predatory OR unreliable OR confusing OR overhyped OR ridiculous OR waste OR scam OR disaster OR pathetic OR lame OR stupid OR dumb OR unintuitive OR bloated OR glitchy OR unresponsive OR trash"
        complaints = fetch_reddit_data(complaint_query, 2, subreddits, require_negative_sentiment=True)
        competitor_complaints.extend(complaints)
        time.sleep(5)  # Delay to avoid rate limits
    data["competitor_complaints"] = competitor_complaints[:2]  # Limit to 2 total

    # Fetch complaints about your company (2 posts/comments, require negative sentiment)
    print("Fetching company complaints from Reddit...")
    company_complaint_query = f"{COMPANY_NAME} delay OR slow OR bad OR issue OR lag OR buggy OR expensive OR overpriced OR terrible OR horrible OR frustrating OR problem OR sucks OR awful OR poor OR disappointing OR crap OR nightmare OR annoying OR useless OR broken OR clunky OR mess OR predatory OR unreliable OR confusing OR overhyped OR ridiculous OR waste OR scam OR disaster OR pathetic OR lame OR stupid OR dumb OR unintuitive OR bloated OR glitchy OR unresponsive OR trash"
    data["company_complaints"] = fetch_reddit_data(company_complaint_query, 2, subreddits, require_negative_sentiment=True)
    time.sleep(5)  # Delay to avoid rate limits

    # Save data to a JSON file
    with open("reddit_data.json", "w") as f:
        json.dump(data, f, indent=4)
    print("Data saved to reddit_data.json")

if __name__ == "__main__":
    scrape_reddit_data()