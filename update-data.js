const fs = require('fs');

// Get CSV file path from command line or use default
const csvFilePath = process.argv[2] || 'data/day2-creators.csv';
console.log('Processing:', csvFilePath);

// BULLETPROOF: Clean values - remove #N/A, #VALUE!, etc.
function cleanValue(val, type = 'string', defaultVal = '') {
    if (val === null || val === undefined) return defaultVal;
    const strVal = String(val).trim();
    // Check for Excel/Google Sheets error codes
    if (strVal === '#N/A' || strVal === '#VALUE!' || strVal === '#REF!' || 
        strVal === '#DIV/0!' || strVal === '#NUM!' || strVal === '#NAME?' ||
        strVal === '#NULL!' || strVal === '#ERROR!') {
        return defaultVal;
    }
    // Type conversion
    if (type === 'number') {
        const cleaned = strVal.replace(/,/g, '').replace(/"/g, '').replace(/\$/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? (defaultVal || 0) : num;
    }
    if (type === 'int') {
        const cleaned = strVal.replace(/,/g, '').replace(/"/g, '');
        const num = parseInt(cleaned, 10);
        return isNaN(num) ? (defaultVal || 0) : num;
    }
    return strVal || defaultVal;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
            if (inQuotes && nextChar === '"') {
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

const csv = fs.readFileSync(csvFilePath, 'utf8');
const lines = csv.split('\n');

const creators = [];
for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols = parseCSVLine(line);
    if (cols.length < 3) continue;
    
    const cid = cols[1];
    const username = cols[2];
    let manager = cols[8] || 'carrington';
    if (manager.includes('+')) manager = manager.split('+')[0].trim();
    
    if (cid && username && !username.includes('@')) {
        const claimed = username.toLowerCase() === 'skylerclarkk';
        
        // Clean manager value
        let manager = cleanValue(cols[8], 'string', 'carrington');
        if (manager.includes('+')) manager = manager.split('+')[0].trim();
        
        const d = {
            id: creators.length + 1,
            creatorId: cid,
            username: username.toLowerCase(),
            name: username,
            email: username + '@taboost.me',
            status: cleanValue(cols[3], 'string', 'GO'),
            level: cleanValue(cols[4], 'string', '0'),
            month: cleanValue(cols[5], 'string', ''),
            manager: manager.toUpperCase(),
            m: manager.toUpperCase(),
            claimed: claimed,
            score: cleanValue(cols[32], 'int', 0),
            diamonds: cleanValue(cols[19], 'int', 0),
            diamondsGoal: cleanValue(cols[21], 'int', 0),
            diamondsPace: cleanValue(cols[20], 'string', '0'),
            diamondsLast30: cleanValue(cols[27], 'int', 0),
            diamondsLastMonth: cleanValue(cols[28], 'int', 0),
            diamonds2MonthsAgo: cleanValue(cols[29], 'int', 0),
            hours: cleanValue(cols[16], 'int', 0),
            hoursGoal: cleanValue(cols[17], 'int', 0),
            hoursLeft: cleanValue(cols[18], 'string', '0'),
            validLiveDays: cleanValue(cols[12], 'int', 0),
            daysGoal: cleanValue(cols[14], 'int', 0),
            daysLeft: cleanValue(cols[15], 'string', '0'),
            tier: cleanValue(cols[21], 'int', 0),
            tierGoal: cleanValue(cols[22], 'int', 0),
            tierLeft: cleanValue(cols[23], 'string', '0'),
            tierStatus: cleanValue(cols[24], 'string', '-'),
            tierLastMonth: cleanValue(cols[25], 'string', '-'),
            growthPercent: 0,
            earned: cleanValue(cols[33], 'int', 0),
            gifted: cleanValue(cols[34], 'int', 0),
            running: cleanValue(cols[35], 'string', '0'),
            multiply: cleanValue(cols[36], 'string', '-'),
            unlocked: cleanValue(cols[37], 'string', '0'),
            daysMonth: cleanValue(cols[38], 'int', 0),
            hoursMonth: cleanValue(cols[39], 'int', 0),
            rewardsMonth: cleanValue(cols[40], 'string', '0')
        };
        creators.push(d);
    }
}

// Generate data.js content
const timestamp = new Date().toISOString();
let output = '// Taboost Agency - Complete Creator Data\n';
output += '// Generated: ' + timestamp + '\n';
output += '// Total: ' + creators.length + ' creators\n\n';
output += 'const creatorsData = ' + JSON.stringify(creators, null, 2) + ';\n\n';
output += 'const taboostData = {\n';
output += '  creators: creatorsData,\n';
output += '  lastUpdated: "' + timestamp + '",\n';
output += '  getAllCreators: function() { return this.creators; },\n';
output += '  getCreator: function(username) { return this.creators.find(c => c.username === username.toLowerCase()); },\n';
output += '  loadFromCSV: async function() { return this.creators; }\n';
output += '};';

fs.writeFileSync('js/data.js', output);
console.log('Updated js/data.js with', creators.length, 'creators');

const skyler = creators.find(c => c.username === 'skylerclarkk');
if (skyler) {
    console.log('Skyler diamonds:', skyler.diamonds);
    console.log('Skyler score:', skyler.score);
    console.log('Skyler earned:', skyler.earned);
}
