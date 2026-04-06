#!/usr/bin/env python3
"""
Convert HISTORY CSV to creator_trends.json
Usage: python convert_history_csv.py data/history.csv data/creator_trends.json
"""

import csv
import json
import sys
from datetime import datetime

def parse_num(val):
    if not val or val.strip() == '' or val.strip() == '-1' or val.strip() == '#N/A':
        return 0
    try:
        return float(str(val).replace(',', '').replace('"', '').replace('$', ''))
    except:
        return 0

def parse_tier(val):
    if not val or val.strip() == '' or val.strip() == '-1' or val.strip() == '#N/A':
        return None
    try:
        return int(val)
    except:
        return None

def convert_history_csv_to_json(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)
        
        # Discover month labels from Diamonds section (columns 3 to 8)
        # CSV is newest to oldest (e.g. Mar 2026 ... Oct 2025), reverse so oldest first
        month_labels = [m.strip() for m in header[3:9]][::-1]
        
        creators = []
        for row in reader:
            if len(row) < 9:
                continue
                
            username = row[1].strip() if len(row) > 1 else None
            if not username:
                continue
                
            def get_history(start_idx, parse_func):
                if len(row) <= start_idx + 5:
                    # Pad with 0/None if row is short
                    vals = [row[i] if i < len(row) else '' for i in range(start_idx, start_idx+6)]
                else:
                    vals = row[start_idx:start_idx+6]
                
                # Reverse to get Oldest -> Newest
                return [parse_func(v) for v in vals][::-1]

            diamonds_history = get_history(3, parse_num)
            tier_history = get_history(11, parse_tier)
            level_history = get_history(19, parse_tier) 
            rewards_history = get_history(27, parse_num)
            revenue_history = get_history(35, parse_num)
            bonus_history = get_history(43, parse_num)

            # Calculate growth rates for diamonds
            growth_rates = []
            for i in range(6):
                if i == 0:
                    growth_rates.append(0)
                else:
                    prev = diamonds_history[i-1]
                    curr = diamonds_history[i]
                    if prev > 0:
                        growth = round(((curr - prev) / prev) * 100, 1)
                    else:
                        growth = 0
                    growth_rates.append(growth)
            
            tier_current = parse_tier(row[10] if len(row) > 10 else None)
            
            creators.append({
                "username": username,
                "diamondsHistory": diamonds_history,
                "growthRates": growth_rates,
                "tierHistory": tier_history,
                "tierCurrent": tier_current,
                "levelHistory": level_history,
                "rewardsHistory": rewards_history,
                "revenueHistory": revenue_history,
                "bonusHistory": bonus_history
            })

    output_data = {
        "months": month_labels,
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "creators": creators
    }

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2)
        
    print(f"Converted {len(creators)} creators with months {month_labels}")
    return len(creators)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python convert_history_csv.py <input.csv> <output.json>")
        sys.exit(1)
        
    convert_history_csv_to_json(sys.argv[1], sys.argv[2])
