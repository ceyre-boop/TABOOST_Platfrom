# Extract Tier (4th column) and Score (Score column) from CSV
import csv
import json

creator_badges = {}

with open('C:\\Users\\Admin\\.clawdbot\\media\\inbound\\4997df47-7a36-44c1-8ba8-a9a2262ee190.csv', 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    header = next(reader)  # Skip header
    
    for row in reader:
        if len(row) >= 29:
            creator_id = row[1].strip()  # Column B (Host)
            tier = row[3].strip() if len(row) > 3 else ''  # Column D (4th column)
            score = row[28].strip() if len(row) > 28 else ''  # Column AC (Score)
            
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
print("Sample:", list(creator_badges.items())[:3])
