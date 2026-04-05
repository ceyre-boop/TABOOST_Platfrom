#!/usr/bin/env python3
"""
Convert HISTORY CSV to creator_trends.json with DYNAMIC month detection
Usage: python convert_history_csv.py HISTORY.csv creator_trends.json
"""

import csv
import json
import sys
import re

def find_section_indices(headers, section_name):
    """Find start index of a section (DIAMONDS, TIER, etc.) and return next 6 month columns"""
    try:
        start_idx = headers.index(section_name)
        # Get next 6 columns (the month data)
        month_indices = []
        month_labels = []
        for i in range(1, 7):  # Skip the section header, get next 6
            if start_idx + i < len(headers):
                month_indices.append(start_idx + i)
                month_labels.append(headers[start_idx + i].strip())
        return month_indices, month_labels
    except ValueError:
        return [], []

def convert_history_csv_to_json(input_file, output_file):
    """
    Convert HISTORY.csv to creator_trends.json with DYNAMIC month detection
    """
    creators = []
    month_labels = []  # Will be extracted from header
    
    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        headers = next(reader)  # Read header
        
        # Find DIAMONDS section and extract month labels
        diamonds_indices, month_labels = find_section_indices(headers, 'DIAMONDS')
        print(f"Found months: {month_labels}")
        
        if len(diamonds_indices) != 6:
            print(f"WARNING: Expected 6 months, found {len(diamonds_indices)}")
        
        # Find other sections
        tier_indices, _ = find_section_indices(headers, 'TIER')
        rewards_indices, _ = find_section_indices(headers, 'REWARDS')
        
        for row in reader:
            if len(row) < 10:
                continue
            
            username = row[1].strip() if len(row) > 1 else None
            if not username:
                continue
            
            def parse_num(val):
                if not val or val.strip() == '' or val.strip() == '-1':
                    return 0
                try:
                    return int(str(val).replace(',', '').replace('"', ''))
                except:
                    return 0
            
            def parse_tier(val):
                if not val or val.strip() == '' or val.strip() == '-1':
                    return None
                try:
                    return int(val)
                except:
                    return None
            
            # Build diamonds history from dynamic indices (reverse to get oldest first)
            diamonds_history = [parse_num(row[i]) if i < len(row) else 0 for i in reversed(diamonds_indices)]
            
            # Calculate growth rates
            growth_rates = []
            for i in range(len(diamonds_history)):
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
            
            # Build tier history (reversed to oldest first)
            tier_history = [parse_tier(row[i]) if i < len(row) else None for i in reversed(tier_indices)]
            tier_current = tier_history[-1] if tier_history else None
            
            # Build rewards history (reversed to oldest first)
            rewards_history = [parse_num(row[i]) if i < len(row) else 0 for i in reversed(rewards_indices)]
            
            creators.append({
                "username": username,
                "diamondsHistory": diamonds_history,
                "growthRates": growth_rates,
                "tierHistory": tier_history,
                "tierCurrent": tier_current,
                "rewardsHistory": rewards_history
            })
    
    # Write JSON with month labels included (reversed to oldest first)
    output = {
        "meta": {
            "monthLabels": list(reversed(month_labels)),  # Oldest first for chart
            "generated": csv_file
        },
        "creators": creators
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2)
    
    print(f"Converted {len(creators)} creators")
    print(f"Month range: {month_labels[0] if month_labels else 'N/A'} to {month_labels[-1] if month_labels else 'N/A'}")
    return len(creators)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python convert_history_csv.py <input.csv> <output.json>")
        sys.exit(1)
    
    csv_file = sys.argv[1]
    json_file = sys.argv[2]
    convert_history_csv_to_json(csv_file, json_file)
