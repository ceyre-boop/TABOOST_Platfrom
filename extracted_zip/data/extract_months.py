# Extract creator month data from CSV for real "Member for X months"
import csv
import json

creator_months = {}

# Read the latest month's CSV to get current month values
with open('C:\\Users\\Admin\\.clawdbot\\media\\inbound\\4997df47-7a36-44c1-8ba8-a9a2262ee190.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        creator_id = row.get('Host', '').strip()
        month_val = row.get('Month', '').strip()
        if creator_id and month_val:
            try:
                creator_months[creator_id] = int(month_val)
            except:
                pass

# Save as JSON
with open('creator_months.json', 'w') as f:
    json.dump(creator_months, f, indent=2)

print(f"Extracted month data for {len(creator_months)} creators")
