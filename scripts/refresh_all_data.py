import json
import csv
import os
from datetime import datetime

# CONFIGURATION
BASE_DIR = "/Users/taboost/Documents/TABOOST- SHOP/taboost-shop-app/TABOOST_Platfrom-main"
HISTORY_CSV = os.path.join(BASE_DIR, "data/history.csv")
MARCH_CSV = os.path.join(BASE_DIR, "data/current.csv")           # Finalized March snapshots
APRIL_CSV = os.path.join(BASE_DIR, "data/live-data-current.csv")  # Live April metrics
OUTPUT_JSON = os.path.join(BASE_DIR, "data/creator_trends.json")

def clean_val(val):
    if not val or val == "#N/A" or val == "-" or val.strip() == "": return 0
    try:
        return float(str(val).replace(",", "").replace('"', "").replace("$", "").strip())
    except:
        return 0

def find_col(headers, patterns, exclude=None):
    for pattern in patterns:
        for i, h in enumerate(headers):
            if pattern.lower() in h.lower():
                if exclude and any(x.lower() in h.lower() for x in exclude):
                    continue
                return i
    return -1

def refresh():
    print("🚀 Starting Refined 3-Source Merge (Pulling REWARDS section)...")
    
    # 1. LOAD HISTORY (Nov-Feb) - USES HARDCODED REWARDS INDICES
    history_docs = []
    if os.path.exists(HISTORY_CSV):
        with open(HISTORY_CSV, "r", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            headers = next(reader)
            for row in reader:
                if len(row) < 30: continue
                history_docs.append(row)
    
    # 2. LOAD MARCH DATA (current.csv)
    march_data = {}
    if os.path.exists(MARCH_CSV):
        with open(MARCH_CSV, "r", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            headers = next(reader)
            user_idx = find_col(headers, ["3/31", "TikTok", "Host"]) 
            diamonds_idx = find_col(headers, ["💎", "Diamonds", "Total Diamonds", "?"], exclude=["Month", "Last 30"])
            tier_idx = find_col(headers, ["Tier"], exclude=["Goal", "Left", "Status", "LM"])
            
            # Prioritize "Bonus" for March as it contains reward USD
            rewards_idx = find_col(headers, ["Bonus", "Rewards Month"], exclude=["Goal"])
            
            for row in reader:
                if len(row) > user_idx and row[user_idx]:
                    username = row[user_idx].lower().strip()
                    march_data[username] = {
                        "diamonds": clean_val(row[diamonds_idx]) if diamonds_idx >= 0 else 0,
                        "tier": int(clean_val(row[tier_idx])) if tier_idx >= 0 else 0,
                        "rewards": clean_val(row[rewards_idx]) if rewards_idx >= 0 else 0
                    }
    
    # 3. LOAD APRIL DATA (live-data-current.csv)
    april_data = {}
    if os.path.exists(APRIL_CSV):
        with open(APRIL_CSV, "r", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            headers = next(reader)
            user_idx = find_col(headers, ["3/8", "3/22", "TikTok", "Host"])
            if user_idx == -1: user_idx = 2
            
            diamonds_idx = find_col(headers, ["💎", "Diamonds", "Total Diamonds", "?"], exclude=["Month", "Last 30"])
            tier_idx = find_col(headers, ["Tier"], exclude=["Goal", "Left", "Status", "LM"])
            
            # Prioritize "Rewards Month" for April
            rewards_idx = find_col(headers, ["Rewards Month", "Bonus"], exclude=["Goal"])
            
            for row in reader:
                if len(row) > user_idx and row[user_idx]:
                    username = row[user_idx].lower().strip()
                    april_data[username] = {
                        "diamonds": clean_val(row[diamonds_idx]) if diamonds_idx >= 0 else 0,
                        "tier": int(clean_val(row[tier_idx])) if tier_idx >= 0 else 0,
                        "rewards": clean_val(row[rewards_idx]) if rewards_idx >= 0 else 0
                    }

    # 4. MERGE TRENDS
    creators_trends = []
    active_usernames = set(april_data.keys()) | set(march_data.keys())
    history_map = {row[1].lower().strip(): row for row in history_docs}
    
    for username in active_usernames:
        h_row = history_map.get(username)
        
        if h_row:
            # Nov(6), Dec(5), Jan(4), Feb(3)
            d_hist = [clean_val(h_row[6]), clean_val(h_row[5]), clean_val(h_row[4]), clean_val(h_row[3])]
            # Nov(13), Dec(12), Jan(11), Feb(10)
            t_hist = [clean_val(h_row[13]), clean_val(h_row[12]), clean_val(h_row[11]), clean_val(h_row[10])]
            # REWARDS Section: Nov(29), Dec(28), Jan(27), Feb(26)
            r_hist = [clean_val(h_row[29]), clean_val(h_row[28]), clean_val(h_row[27]), clean_val(h_row[26])]
        else:
            d_hist = [0, 0, 0, 0]
            t_hist = [0, 0, 0, 0]
            r_hist = [0, 0, 0, 0]
        
        m_vals = march_data.get(username, {"diamonds": 0, "tier": 0, "rewards": 0})
        d_hist.append(m_vals["diamonds"])
        t_hist.append(m_vals["tier"])
        r_hist.append(m_vals["rewards"])
        
        a_vals = april_data.get(username, {"diamonds": 0, "tier": 0, "rewards": 0})
        d_hist.append(a_vals["diamonds"])
        t_hist.append(a_vals["tier"])
        r_hist.append(a_vals["rewards"])
        
        creators_trends.append({
            "username": username,
            "diamondsHistory": d_hist,
            "tierHistory": t_hist,
            "bonusHistory": r_hist, # This is displayed in the "Bonus" column in history table
            "lastRefresh": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })

    final_output = {
        "meta": {
            "historyLabels": ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"],
            "lastRefresh": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        },
        "creators": creators_trends
    }
    
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(final_output, f, indent=2)
    
    print(f"✅ Success! Merged {len(creators_trends)} creators with full REWARDS history.")

if __name__ == "__main__":
    refresh()
