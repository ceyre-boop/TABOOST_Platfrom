const fs = require('fs');

// Proper CSV parser that handles quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
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

const csv = fs.readFileSync('C:/Users/Admin/.clawdbot/media/inbound/ac2c85f8-9341-484d-a831-89939743529d.csv', 'utf8');
const lines = csv.trim().split('\n');
const headers = parseCSVLine(lines[0]);

console.log('Columns found:', headers.length);
console.log('Key columns:');
console.log('  1: Host (Creator ID)');
console.log('  2: Username');
console.log('  4: Level');
console.log('  5: Month');
console.log('  8: Agent');
console.log('  12: Days');
console.log('  14: Days Goal');
console.log('  16: Hours');
console.log('  17: Hrs Goal');
console.log('  19: Diamonds');
console.log('  21: Tier');
console.log('  24: Tier Status');
console.log('  25: Tier LM (Last Month)');
console.log('  28: -1 Month Diamonds');
console.log('  29: -2 Month Diamonds');
console.log('  32: Score');
console.log('  33: Earned\n');

const creatorMonths = {};
const creatorBadges = {};
const allCreators = [];

for (let i = 1; i < lines.length; i++) {
  const values = parseCSVLine(lines[i]);
  if (values.length < 35) continue;
  
  // Parse numbers helper
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
  
  // Creator months
  creatorMonths[creatorId] = parseInt(month) || 0;
  
  // Creator badges
  creatorBadges[creatorId] = {
    tier: parseNum(tier),
    score: parseNum(score)
  };
  
  // Parse level - empty string becomes null
  let levelValue = null;
  if (level && level !== '' && level !== '""') {
    const parsed = parseInt(level);
    if (!isNaN(parsed) && parsed > 0) {
      levelValue = parsed;
    }
  }
  
  allCreators.push({
    creatorId,
    username,
    level: levelValue,
    month: parseInt(month) || 0,
    diamonds: parseNum(diamonds),
    days: parseNum(days),
    hours: parseNum(hours),
    daysGoal: parseNum(daysGoal) || 25,
    hoursGoal: parseNum(hrsGoal) || 80,
    tier: parseNum(tier),
    score: parseNum(score),
    agent: agent || '',
    tierStatus: tierStatus || '',
    lastMonthTier: parseNum(lastMonthTier),
    diamondsLastMonth: parseNum(diamondsLastMonth),
    diamondsTwoMonthsAgo: parseNum(diamondsTwoMonthsAgo),
    earned: parseNum(earned)
  });
}

// Write JSON files
fs.writeFileSync('data/creator_months.json', JSON.stringify(creatorMonths, null, 2));
fs.writeFileSync('data/creator_badges.json', JSON.stringify(creatorBadges, null, 2));
fs.writeFileSync('data/creators_full.json', JSON.stringify(allCreators, null, 2));

console.log('✅ Updated data files:');
console.log('  - data/creator_months.json (' + Object.keys(creatorMonths).length + ' creators)');
console.log('  - data/creator_badges.json (' + Object.keys(creatorBadges).length + ' creators)');
console.log('  - data/creators_full.json (' + allCreators.length + ' creators)');
console.log('\n📊 Sample creators:');
console.log('1.', allCreators[0]?.username, '- Level:', allCreators[0]?.level, '| 💎', allCreators[0]?.diamonds.toLocaleString(), '| Tier:', allCreators[0]?.tier, '| Score:', allCreators[0]?.score);
console.log('2.', allCreators[1]?.username, '- Level:', allCreators[1]?.level, '| 💎', allCreators[1]?.diamonds.toLocaleString(), '| Tier:', allCreators[1]?.tier, '| Score:', allCreators[1]?.score);
console.log('3.', allCreators[2]?.username, '- Level:', allCreators[2]?.level, '| 💎', allCreators[2]?.diamonds.toLocaleString(), '| Tier:', allCreators[2]?.tier, '| Score:', allCreators[2]?.score);
