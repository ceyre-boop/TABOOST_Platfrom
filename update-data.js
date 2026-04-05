const fs = require('fs');

// Get CSV file path from command line or use default
const csvFilePath = process.argv[2] || 'data/day2-creators.csv';
console.log('Processing:', csvFilePath);

// BULLETPROOF: Clean values - remove #N/A, #VALUE!, etc.
function cleanValue(val, type = 'string', defaultVal = '') {
    if (val === null || val === undefined) return defaultVal;
    const strVal = String(val).trim();
    if (strVal === '#N/A' || strVal === '#VALUE!' || strVal === '#REF!' || 
        strVal === '#DIV/0!' || strVal === '#NUM!' || strVal === '#NAME?' ||
        strVal === '#NULL!' || strVal === '#ERROR!') {
        return defaultVal;
    }
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

// Parse header to find column indices dynamically
function parseHeader(headers) {
    const findIdx = (names) => {
        for (const name of names) {
            const idx = headers.findIndex(h => h.trim().toLowerCase() === name.toLowerCase());
            if (idx !== -1) return idx;
        }
        return -1;
    };
    
    return {
        uid: 1,
        username: 2,
        status: 3,
        level: findIdx(['level']) !== -1 ? findIdx(['level']) : 4,
        month: findIdx(['month']) !== -1 ? findIdx(['month']) : 5,
        agent: findIdx(['agent']) !== -1 ? findIdx(['agent']) : 8,
        days: findIdx(['days']) !== -1 ? findIdx(['days']) : 12,
        daysGoal: findIdx(['days goal']) !== -1 ? findIdx(['days goal']) : 14,
        hours: findIdx(['hours']) !== -1 ? findIdx(['hours']) : 16,
        hrsGoal: findIdx(['hrs goal']) !== -1 ? findIdx(['hrs goal']) : 17,
        diamonds: findIdx(['💎', '?']) !== -1 ? findIdx(['💎', '?']) : 19,
        tier: findIdx(['tier']) !== -1 ? findIdx(['tier']) : 21,
        tierGoal: findIdx(['tier goal']) !== -1 ? findIdx(['tier goal']) : 22,
        score: findIdx(['score']) !== -1 ? findIdx(['score']) : 32,
        earned: findIdx(['earned']) !== -1 ? findIdx(['earned']) : 33,
        gifted: findIdx(['gifted']) !== -1 ? findIdx(['gifted']) : 34,
        running: findIdx(['running']) !== -1 ? findIdx(['running']) : 35,
        unlocked: findIdx(['unlocked']) !== -1 ? findIdx(['unlocked']) : 37
    };
}

const csv = fs.readFileSync(csvFilePath, 'utf8');
const lines = csv.split('\n');

const headers = parseCSVLine(lines[0]);
console.log('CSV columns:', headers.length);
const col = parseHeader(headers);

const creators = [];
for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cols = parseCSVLine(line);
    if (cols.length < 3) continue;
    
    const cid = cols[col.uid];
    const username = cols[col.username];
    
    if (cid && username && !username.includes('@') && !username.includes('/')) {
        let manager = cleanValue(cols[col.agent], 'string', 'carrington');
        if (manager.includes('+')) manager = manager.split('+')[0].trim();
        
        creators.push({
            id: creators.length + 1,
            creatorId: cid,
            username: username.toLowerCase(),
            name: username,
            email: username + '@taboost.me',
            status: cleanValue(cols[col.status], 'string', 'GO'),
            level: cleanValue(cols[col.level], 'string', '0'),
            month: cleanValue(cols[col.month], 'string', ''),
            manager: manager.toUpperCase(),
            score: cleanValue(cols[col.score], 'int', 0),
            diamonds: cleanValue(cols[col.diamonds], 'int', 0),
            diamondsGoal: cleanValue(cols[col.tierGoal], 'int', 0),
            hours: cleanValue(cols[col.hours], 'int', 0),
            hoursGoal: cleanValue(cols[col.hrsGoal], 'int', 0),
            validLiveDays: cleanValue(cols[col.days], 'int', 0),
            daysGoal: cleanValue(cols[col.daysGoal], 'int', 0),
            tier: cleanValue(cols[col.tier], 'int', 0),
            tierGoal: cleanValue(cols[col.tierGoal], 'int', 0),
            earned: cleanValue(cols[col.earned], 'int', 0),
            gifted: cleanValue(cols[col.gifted], 'int', 0),
            running: cleanValue(cols[col.running], 'string', '0'),
            unlocked: cleanValue(cols[col.unlocked], 'string', '0')
        });
    }
}

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

const test = creators[0];
if (test) console.log('Sample:', test.username, '| diamonds:', test.diamonds, '| score:', test.score);
