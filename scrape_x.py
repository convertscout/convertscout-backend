import snscrape.modules.twitter as sntwitter
import time
import json

# Placeholder business details (replace with your actual details)
TARGET_KEYWORD = "slow shipping solutions"  # For leads
COMPETITORS = ["HubSpot", "Salesforce"]      # For competitor complaints
COMPANY_NAME = "Acme Solutions"             # For complaints about your company

# Function to fetch tweets with a delay
def fetch_tweets(query, limit):
    tweets = []
    for i, tweet in enumerate(sntwitter.TwitterSearchScraper(query).get_items()):
        if i >= limit:
            break
        tweets.append({
            "username": tweet.user.username,
            "platform": "𝕏",
            "text": tweet.content,
            "time": tweet.date.isoformat(),
            "match": 90 + (i * 2)  # Simulated match score (90–98%)
        })
    return tweets

# Fetch data
def scrape_x_data():
    data = {
        "leads": [],
        "competitor_complaints": [],
        "company_complaints": []
    }

    # Fetch leads (5 tweets)
    print("Fetching leads...")
    leads_query = f"{TARGET_KEYWORD} -is:retweet lang:en"
    data["leads"] = fetch_tweets(leads_query, 5)
    time.sleep(5)  # 5-second delay to avoid detection

    # Fetch competitor complaints (2 tweets total)
    print("Fetching competitor complaints...")
    competitor_complaints = []
    for competitor in COMPETITORS:
        complaint_query = f"{competitor} (lag OR slow OR buggy OR expensive) -is:retweet lang:en"
        complaints = fetch_tweets(complaint_query, 1)  # 1 per competitor
        competitor_complaints.extend(complaints)
        time.sleep(5)  # 5-second delay
    data["competitor_complaints"] = competitor_complaints[:2]  # Limit to 2 total

    # Fetch complaints about your company (2 tweets)
    print("Fetching company complaints...")
    company_complaint_query = f"{COMPANY_NAME} (delay OR slow OR bad OR issue) -is:retweet lang:en"
    data["company_complaints"] = fetch_tweets(company_complaint_query, 2)
    time.sleep(5)  # 5-second delay

    # Save data to a JSON file
    with open("x_data.json", "w") as f:
        json.dump(data, f, indent=4)
    print("Data saved to x_data.json")

if __name__ == "__main__":
    scrape_x_data()