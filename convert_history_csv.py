#!/usr/bin/env python3
"""
Convert HISTORY CSV to creator_trends.json
Usage: python convert_history_csv.py data/history.csv data/creator_trends.json [data/monthly-hours-days.csv]

Also merges per-month Days and Hours (for the Stream Master / Hour Crusher achievements in the
creator dashboard's month-detail modal) from a sibling `monthly-hours-days.csv` if present. That
file is a long-format export -- one row per creator per month -- with columns: uid and/or username,
month, days, hours. Values are aligned by month label to the HISTORY window and emitted as
daysHistory[] / hoursHistory[] (oldest -> newest, -1 where a creator-month is missing). If the file
is absent the arrays are all -1 and the two achievements simply render locked -- nothing else changes.
"""

import csv
import json
import os
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


def parse_int(val):
    """Non-negative integer, or -1 for blank/invalid (the 'no data' sentinel the modal checks)."""
    if val is None:
        return -1
    s = str(val).replace(',', '').replace('"', '').strip()
    if s == '' or s == '#N/A':
        return -1
    try:
        return int(round(float(s)))
    except:
        return -1


def normalize_month(label):
    """Map a variety of month formats to a canonical 'YYYY-MM' key, or None if unrecognized."""
    if not label:
        return None
    s = str(label).strip().replace('"', '')
    for fmt in ('%b %Y', '%B %Y', '%Y-%m', '%m/%Y', '%Y-%m-%d', '%m/%d/%Y', '%b-%Y', '%B-%Y'):
        try:
            return datetime.strptime(s, fmt).strftime('%Y-%m')
        except ValueError:
            continue
    return None


def _find_col(header_lower, *names):
    for n in names:
        if n in header_lower:
            return header_lower.index(n)
    for i, h in enumerate(header_lower):
        for n in names:
            if n in h:
                return i
    return -1


def load_hours_days(path):
    """Return ({key: {canon_month: (days, hours)}}, rows_seen) keyed by uid AND lowercased username."""
    lookup = {}
    if not path or not os.path.exists(path):
        return lookup, 0
    rows_seen = 0
    with open(path, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        try:
            header = next(reader)
        except StopIteration:
            return lookup, 0
        hl = [h.strip().lower() for h in header]
        uid_i = _find_col(hl, 'uid', 'creatorid', 'creator_id')
        user_i = _find_col(hl, 'username', 'handle', 'tiktok', 'host', 'creator', 'user')
        month_i = _find_col(hl, 'month', 'period', 'date')
        days_i = _find_col(hl, 'days', 'validlivedays', 'valid live days', 'live days')
        hours_i = _find_col(hl, 'hours', 'hrs')
        if month_i == -1 or days_i == -1 or hours_i == -1 or (uid_i == -1 and user_i == -1):
            print(f"WARN: {path} missing required columns (need month, days, hours, and uid or username); skipping merge")
            return lookup, 0
        for row in reader:
            if len(row) <= max(month_i, days_i, hours_i):
                continue
            canon = normalize_month(row[month_i])
            if not canon:
                continue
            entry = (parse_int(row[days_i]), parse_int(row[hours_i]))
            keys = []
            if uid_i != -1 and uid_i < len(row) and row[uid_i].strip():
                keys.append(row[uid_i].strip())
            if user_i != -1 and user_i < len(row) and row[user_i].strip():
                keys.append(row[user_i].strip().lower())
            for k in keys:
                lookup.setdefault(k, {})[canon] = entry
            rows_seen += 1
    return lookup, rows_seen


def convert_history_csv_to_json(input_file, output_file, hd_file=None):
    if hd_file is None:
        hd_file = os.path.join(os.path.dirname(input_file), 'monthly-hours-days.csv')
    hd_lookup, hd_rows = load_hours_days(hd_file)

    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f)
        header = next(reader)

        # Discover month labels from Diamonds section (columns 3 to 8)
        # CSV is newest to oldest (e.g. May 2026 ... Dec 2025), reverse so oldest first
        month_labels = [m.strip() for m in header[3:9]][::-1]
        month_canon = [normalize_month(m) for m in month_labels]

        creators = []
        hd_matched = 0
        for row in reader:
            if len(row) < 9:
                continue

            username = row[1].strip() if len(row) > 1 else None
            if not username:
                continue
            uid = row[0].strip() if len(row) > 0 else ''

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

            # Merge per-month Days/Hours (Stream Master / Hour Crusher), aligned to month_labels.
            # Match by UID first (stable), then lowercased username.
            hd = hd_lookup.get(uid) or hd_lookup.get(username.lower()) or {}
            if hd:
                hd_matched += 1
            days_history = [hd.get(c, (-1, -1))[0] if c else -1 for c in month_canon]
            hours_history = [hd.get(c, (-1, -1))[1] if c else -1 for c in month_canon]

            creators.append({
                "username": username,
                "diamondsHistory": diamonds_history,
                "growthRates": growth_rates,
                "tierHistory": tier_history,
                "tierCurrent": tier_current,
                "levelHistory": level_history,
                "rewardsHistory": rewards_history,
                "revenueHistory": revenue_history,
                "bonusHistory": bonus_history,
                "daysHistory": days_history,
                "hoursHistory": hours_history
            })

    output_data = {
        "months": month_labels,
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "creators": creators
    }

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=2)

    print(f"Converted {len(creators)} creators with months {month_labels}")
    if hd_rows:
        print(f"Merged Days/Hours from {hd_file}: {hd_rows} rows, matched {hd_matched}/{len(creators)} creators")
    else:
        print(f"No Days/Hours merge ({hd_file} absent or empty) -- daysHistory/hoursHistory = -1")
    return len(creators)


if __name__ == "__main__":
    if len(sys.argv) not in (3, 4):
        print("Usage: python convert_history_csv.py <input.csv> <output.json> [monthly-hours-days.csv]")
        sys.exit(1)

    hd = sys.argv[3] if len(sys.argv) == 4 else None
    convert_history_csv_to_json(sys.argv[1], sys.argv[2], hd)
