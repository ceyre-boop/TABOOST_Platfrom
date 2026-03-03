# Extract Tier (Status column U) and Score (column AC/28) from CSV
import csv
import json

creator_badges = {}

with open('C:\\Users\\Admin\\.clawdbot\\media\\inbound\\4997df47-7a36-44c1-8ba8-a9a2262ee190.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        creator_id = row.get('Host', '').strip()
        if creator_id:
            # Column U (Status) = Tier
            tier = row.get('Status', '').strip()
            
            # Column AC (Score) - index 28
            score = row.get('Score', '').strip()
            
            # Clean score value
            try:
                score_val = int(score) if score else 0
            except:
                score_val = 0
            
            creator_badges[creator_id] = {
                'tier': tier if tier else 'NR',
                'score': score_val
            }

with open('creator_badges.json', 'w') as f:
    json.dump(creator_badges, f, indent=2)

print(f"Extracted badge data for {len(creator_badges)} creators")
print("Sample:", list(creator_badges.items())[:3])
