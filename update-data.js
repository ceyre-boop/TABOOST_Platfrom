const fs = require('fs');

// Parse CSV line handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

const csv = fs.readFileSync('C:/Users/Admin/.clawdbot/media/inbound/4d1deb82-2a7f-4194-ad7a-375c3c807273.csv', 'utf8');
const lines = csv.trim().split('\n');

const creatorMonths = {};
const creatorBadges = {};
const allCreators = [];

for (let i = 1; i < lines.length; i++) {
  const values = parseCSVLine(lines[i]);
  if (values.length < 35) continue;
  
  const parseNum = (v) => {
    if (!v || v === '""' || v === '') return 0;
    return parseInt(v.replace(/,/g, '').replace(/"/g, '')) || 0;
  };
  
  const creatorId = values[1];
  const username = values[2];
  const level = values[4];
  const month = values[5];
  const agent = values[8];
  const days = values[12];
  const daysGoal = values[14];
  const hours = values[16];
  const hrsGoal = values[17];
  const diamonds = values[19];
  const tier = values[21];
  const tierStatus = values[24];
  const lastMonthTier = values[25];
  const diamondsLastMonth = values[28];
  const diamondsTwoMonthsAgo = values[29];
  const score = values[32];
  const earned = values[33];
  
  if (!creatorId || !username) continue;
  
  creatorMonths[creatorId] = parseInt(month) || 0;
  creatorBadges[creatorId] = { tier: parseNum(tier), score: parseNum(score) };
  
  let levelValue = null;
  if (level && level !== '' && level !== '""') {
    const parsed = parseInt(level);
    if (!isNaN(parsed) && parsed > 0) levelValue = parsed;
  }
  
  allCreators.push({
    creatorId, username, level: levelValue,
    month: parseInt(month) || 0,
    diamonds: parseNum(diamonds),
    days: parseNum(days), hours: parseNum(hours),
    daysGoal: parseNum(daysGoal) || 25,
    hoursGoal: parseNum(hrsGoal) || 80,
    tier: parseNum(tier), score: parseNum(score),
    agent: agent || '', tierStatus: tierStatus || '',
    lastMonthTier: parseNum(lastMonthTier),
    diamondsLastMonth: parseNum(diamondsLastMonth),
    diamondsTwoMonthsAgo: parseNum(diamondsTwoMonthsAgo),
    earned: parseNum(earned)
  });
}

fs.writeFileSync('data/creator_months.json', JSON.stringify(creatorMonths, null, 2));
fs.writeFileSync('data/creator_badges.json', JSON.stringify(creatorBadges, null, 2));
fs.writeFileSync('data/creators_full.json', JSON.stringify(allCreators, null, 2));

console.log('✅ Updated', allCreators.length, 'creators');
console.log('Sample:', allCreators[0]?.username, '| Level:', allCreators[0]?.level, '| 💎', allCreators[0]?.diamonds.toLocaleString(), '| Tier:', allCreators[0]?.tier, '| Score:', allCreators[0]?.score);
