#!/usr/bin/env python3
"""
Rebuild data/monthly-hours-days.csv (per-month Days/Hours for the Stream Master /
Hour Crusher achievements) from direct monthly export files named
"data/Live Agency Reports (US) - <Mon> <YYYY>.csv".

Usage: python build_monthly_hours_days.py
Run whenever a new month's export lands in data/ -- it discovers every matching
file automatically and replaces that month's rows in monthly-hours-days.csv,
leaving rows for any other month (e.g. one with no direct export, like the
initial Dec 2025 diamond-matched estimate) untouched.

Columns are consistent across export files despite label drift elsewhere in the
header: col 1 = UID (Host), col 2 = username (TikTok), col 12 = Days, col 16 =
Hours. Blank Days/Hours means the creator had 0 activity that month (they're
present in the export row), not "no data" -- so blank parses to 0.
"""
import csv
import glob
import os
import re

REPO = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(REPO, 'data/monthly-hours-days.csv')
UID_I, USER_I, DAYS_I, HOURS_I = 1, 2, 12, 16

FILE_RE = re.compile(r'^Live Agency Reports \(US\) - (\w{3} \d{4})\.csv$')


def parse_int(v):
    v = (v or '').strip().replace(',', '').replace('"', '')
    if v in ('', '-', '#N/A'):
        return 0
    try:
        return int(round(float(v)))
    except ValueError:
        return -1  # genuinely unparseable, not just blank


def discover_month_files():
    months = {}
    for path in glob.glob(os.path.join(REPO, 'data', 'Live Agency Reports (US) - *.csv')):
        m = FILE_RE.match(os.path.basename(path))
        if m:
            months[m.group(1)] = path
    return months


def extract_month_rows(path, month):
    rows = []
    skipped = 0
    with open(path, encoding='utf-8') as f:
        reader = csv.reader(f)
        next(reader)  # header
        for row in reader:
            if len(row) <= HOURS_I:
                continue
            uid = row[UID_I].strip()
            username = row[USER_I].strip()
            if not uid or not uid.isdigit() or not username:
                skipped += 1
                continue
            rows.append({
                'uid': uid, 'username': username, 'month': month,
                'days': str(parse_int(row[DAYS_I])), 'hours': str(parse_int(row[HOURS_I])),
            })
    return rows, skipped


def main():
    month_files = discover_month_files()
    if not month_files:
        print("No 'Live Agency Reports (US) - <Mon> <YYYY>.csv' files found in data/ -- nothing to do")
        return

    kept = []
    if os.path.exists(OUT):
        with open(OUT, encoding='utf-8') as f:
            for row in csv.DictReader(f):
                if row['month'] not in month_files:
                    kept.append(row)

    new_rows = []
    for month in sorted(month_files, key=lambda m: (m.split()[1], m.split()[0])):
        path = month_files[month]
        rows, skipped = extract_month_rows(path, month)
        new_rows.extend(rows)
        print(f"{month}: {len(rows)} creator rows from {os.path.basename(path)} "
              f"({skipped} skipped: non-numeric UID / blank username)")

    print(f"Carried over {len(kept)} existing rows for months without a direct export this run")

    all_rows = kept + new_rows
    with open(OUT, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=['uid', 'username', 'month', 'days', 'hours'])
        w.writeheader()
        w.writerows(all_rows)

    print(f"Wrote {len(all_rows)} total rows to {OUT}")


if __name__ == '__main__':
    main()
