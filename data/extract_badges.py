# Extract Tier (column V) and Score (column AG) from LATEST CSV
import csv
import json

creator_badges = {}

with open('C:\\Users\\Admin\\.clawdbot\\media\\inbound\\48d2239d-8660-4643-8303-8f9c0d35d319.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)  # Skip header
    
    for row in reader:
        if len(row) >= 33:
            creator_id = row[1].strip()  # Column B (Host)
            tier = row[21].strip() if len(row) > 21 else ''  # Column V (Tier) - shifted from U
            score = row[32].strip() if len(row) > 32 else ''  # Column AG (Score) - shifted from AF
            
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
