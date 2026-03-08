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

// Parse number with commas
const parseNum = (v) => {
  if (!v || v === '""' || v === '') return 0;
  return parseInt(v.replace(/,/g, '').replace(/"/g, '')) || 0;
};

// Parse float
const parseFloatNum = (v) => {
  if (!v || v === '""' || v === '') return 0;
  return parseFloat(v.replace(/,/g, '').replace(/"/g, '').replace('%', '')) || 0;
};

const csv = fs.readFileSync('C:/Users/Admin/.clawdbot/media/inbound/4d1deb82-2a7f-4194-ad7a-375c3c807273.csv', 'utf8');
const lines = csv.trim().split('\n');

// Parse header to get column positions
const headers = parseCSVLine(lines[0]);
const getColIndex = (name) => headers.findIndex(h => h.trim() === name);

// Column mapping based on user's CSV
const COLS = {
  host: getColIndex('Host'),
  username: getColIndex('3/5'),           // Column C - username
  level: getColIndex('Level'),             // Column E
  month: getColIndex('Month'),             // Column F
  discord: getColIndex('Discord'),         // Column G
  badge: getColIndex('Badge'),             // Column H
  agent: getColIndex('Agent'),             // Column I
  days: getColIndex('Days'),               // Column M
  dayPace: getColIndex('Day Pace'),        // Column N
  daysGoal: getColIndex('Days Goal'),      // Column O
  hours: getColIndex('Hours'),             // Column Q
  hrsGoal: getColIndex('Hrs Goal'),        // Column R
  diamonds: getColIndex('💎'),             // Column T
  diamondPace: getColIndex('💎 Pace'),     // Column U
  tier: getColIndex('Tier'),               // Column V
  tierGoal: getColIndex('Tier Goal'),      // Column W
  tierLeft: getColIndex('Tier Left'),      // Column X
  tierStatus: getColIndex('Tier Status'),  // Column Y
  tierLM: getColIndex('Tier LM'),          // Column Z
  diamondsLast30: getColIndex('💎 Last 30'), // Column AB
  diamondsLastMonth: getColIndex('-1 Month 💎'), // Column AC
  diamondsTwoMonthsAgo: getColIndex('-2 Month 💎'), // Column AD
  lastMonthLevel: getColIndex('-1 Level'), // Column AE
  twoMonthsAgoLevel: getColIndex('-2 Level'), // Column AF
  score: getColIndex('Score'),             // Column AG
  earned: getColIndex('Earned'),           // Column AH
  gifted: getColIndex('Gifted'),           // Column AI
  running: getColIndex('Running'),         // Column AJ
  multiply: getColIndex('Multiply'),       // Column AK
  unlocked: getColIndex('Unlocked'),       // Column AL
  daysMonth: getColIndex('Days Month'),    // Column AM
  hoursMonth: getColIndex('Hours Month'),  // Column AN
  link: getColIndex('Link')                // Column AO
};

console.log('Column mapping:', COLS);

const creatorMonths = {};
const creatorBadges = {};
const allCreators = [];

for (let i = 1; i < lines.length; i++) {
  const values = parseCSVLine(lines[i]);
  if (values.length < 35) continue;
  
  const creatorId = values[COLS.host];
  const username = values[COLS.username];
  const level = values[COLS.level];
  const month = values[COLS.month];
  const discord = values[COLS.discord];
  const agent = values[COLS.agent];
  const badge = values[COLS.badge];
  const days = values[COLS.days];
  const daysGoal = values[COLS.daysGoal];
  const hours = values[COLS.hours];
  const hrsGoal = values[COLS.hrsGoal];
  const diamonds = values[COLS.diamonds];
  const tier = values[COLS.tier];
  const tierGoal = values[COLS.tierGoal];
  const tierLeft = values[COLS.tierLeft];
  const tierStatus = values[COLS.tierStatus];
  const lastMonthTier = values[COLS.tierLM];
  const diamondsLast30 = values[COLS.diamondsLast30];
  const diamondsLastMonth = values[COLS.diamondsLastMonth];
  const diamondsTwoMonthsAgo = values[COLS.diamondsTwoMonthsAgo];
  const score = values[COLS.score];
  const earned = values[COLS.earned];
  const gifted = values[COLS.gifted];
  const running = values[COLS.running];
  const multiply = values[COLS.multiply];
  const unlocked = values[COLS.unlocked];
  const dayPace = values[COLS.dayPace];
  const diamondPace = values[COLS.diamondPace];
  
  if (!creatorId || !username) continue;
  
  // Parse level - empty string becomes null
  let levelValue = null;
  if (level && level !== '' && level !== '""') {
    const parsed = parseInt(level);
    if (!isNaN(parsed) && parsed > 0) {
      levelValue = parsed;
    }
  }
  
  // Calculate tier goal if not provided
  const tierNum = parseNum(tier) || 1;
  const calculatedTierGoal = parseNum(tierGoal) || (tierNum * 1000000);
  
  // Creator months (column F)
  creatorMonths[creatorId] = parseInt(month) || 0;
  
  // Creator badges
  creatorBadges[creatorId] = {
    tier: parseNum(tier),
    score: parseNum(score)
  };
  
  allCreators.push({
    creatorId,
    username,
    level: levelValue,
    month: parseInt(month) || 0,
    discord: discord || '',
    badge: badge || '',
    agent: agent || '',
    days: parseNum(days),
    daysGoal: parseNum(daysGoal) || 25,
    dayPace: parseFloatNum(dayPace),
    hours: parseNum(hours),
    hoursGoal: parseNum(hrsGoal) || 80,
    diamonds: parseNum(diamonds),
    diamondPace: parseFloatNum(diamondPace),
    tier: tierNum,
    tierGoal: calculatedTierGoal,
    tierLeft: parseNum(tierLeft),
    tierStatus: tierStatus || '',
    lastMonthTier: parseNum(lastMonthTier),
    diamondsLast30: parseNum(diamondsLast30),
    diamondsLastMonth: parseNum(diamondsLastMonth),
    diamondsTwoMonthsAgo: parseNum(diamondsTwoMonthsAgo),
    score: parseNum(score),
    earned: parseNum(earned),
    gifted: parseNum(gifted),
    running: running || '',
    multiply: multiply || '',
    unlocked: unlocked || ''
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
