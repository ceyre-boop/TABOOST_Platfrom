# Extract Tier (column U) and Score (column AF) from NEW CSV
import csv
import json

creator_badges = {}

with open('C:\\Users\\Admin\\.clawdbot\\media\\inbound\\637997de-ef15-4426-a9f3-ae64576bd764.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)  # Skip header
    
    for row in reader:
        if len(row) >= 32:
            creator_id = row[1].strip()  # Column B (Host)
            tier = row[20].strip() if len(row) > 20 else ''  # Column U (Tier)
            score = row[31].strip() if len(row) > 31 else ''  # Column AF (Score)
            
            if creator_id:
                # Clean score value
                try:
                    score_val = int(score.replace(',', '')) if score else 0
                except:
                    score_val = 0
                
                creator_badges[creator_id] = {
                    'tier': tier if tier else '-',
                    'score': score_val
                }

with open('creator_badges.json', 'w') as f:
    json.dump(creator_badges, f, indent=2)

print(f"Extracted badge data for {len(creator_badges)} creators")
print("Sample:", list(creator_badges.items())[:5])
