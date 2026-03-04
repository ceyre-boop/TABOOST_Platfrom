// Taboost Agency - Google Sheets Data Integration
// Fetches live data from Marco's view-only sheet

class TaboostDataService {
    constructor() {
        // Google Sheet published CSV URL (replace with actual published URL)
        // For dev, we'll load from local CSV file
        this.csvUrl = './data/live-data-current.csv';
        this.creators = [];
        this.lastFetch = null;
    }

    // Parse CSV line handling quoted fields
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++; // Skip next quote
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

    // Format number with commas
    formatNumber(num) {
        if (!num || num === '' || num === 'NR') return 0;
        return parseInt(num.toString().replace(/,/g, '')) || 0;
    }

    // Parse the CSV data into structured objects
    parseCSVData(csvText) {
        const lines = csvText.trim().split('\n');
        if (lines.length < 2) return [];

        const headers = this.parseCSVLine(lines[0]);
        const creators = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length < 10) continue; // Skip incomplete rows

            const creator = this.mapRowToCreator(headers, values);
            if (creator) creators.push(creator);
        }

        return creators;
    }

    // Map CSV row to creator object
    mapRowToCreator(headers, values) {
        const getValue = (name) => {
            const idx = headers.indexOf(name);
            return idx >= 0 ? values[idx] : '';
        };

        const username = getValue('TikTok');
        if (!username) return null;

        return {
            rank: parseInt(getValue('Rank')) || 0,
            creatorId: getValue('Host'),
            username: username,
            level: parseInt(getValue('Level')) || 0,
            month: parseInt(getValue('Month')) || 0,
            discord: getValue('Discord'),
            // Agent/Manager field from Google Sheet
            manager: this.formatManagerName(getValue('Agent')),
            rawManager: getValue('Agent'),
            
            // Rewards data from sheet
            rewards: {
                earned: this.formatNumber(getValue('Earned')),
                gifted: this.formatNumber(getValue('Gifted')),
                bonus: this.formatNumber(getValue('Bonus')),
                running: this.formatNumber(getValue('Running')),
                unlocked: this.formatNumber(getValue('Unlocked'))
            },
            
            // Reward source info (column AP = Last Label)
            lastRewardLabel: getValue('Last Label'),
            
            // Total rewards ever unlocked (column AG)
            totalUnlocked: this.formatNumber(getValue('Unlocked')),
            
            // Performance metrics
            diamonds: this.formatNumber(getValue('Diamonds 💎')),
            diamondsLast30: this.formatNumber(getValue('💎 Last 30')),
            growthPercent: getValue('Growth %'),
            hours: parseFloat(getValue('Hours')) || 0,
            hrsGoal: parseInt(getValue('Hrs Goal')) || 80,
            hoursLeft: parseFloat(getValue('Hours Left')) || 0,
            
            // Activity metrics
            liveStreams: parseInt(getValue('Days')) || 0, // Days = streaming days
            validLiveDays: parseInt(getValue('Days')) || 0,
            dayPace: getValue('Day Pace'),
            diamondPace: parseInt(getValue('dY\'Z Pace')) || 0, // Column U - 💎 Pace
            followers: this.formatNumber(getValue('LF')),
            tickets: getValue('Tix'),
            
            // Status & scoring
            status: getValue('Status'),
            score: parseInt(getValue('Score')) || 0,
            graduationLeft: getValue('Grad Left'),
            
            // Historical data
            diamondsLastMonth: this.formatNumber(getValue('-1 Month 💎')),
            diamondsTwoMonthsAgo: this.formatNumber(getValue('-2 Month 💎')),
            
            // Labels & links
            rankLabel: getValue('Rank Label'),
            detailsLabel: getValue('Details Label'),
            link: getValue('Link'),
            diamondLabel: getValue('Diamond Label'),
            lastLabel: getValue('Last Label'),
            
            // Internal grouping
            group: this.determineGroup(getValue('Agent')),
            
            // Timestamps
            lastUpdated: new Date().toISOString()
        };
    }

    // Format manager name for display
    formatManagerName(agent) {
        if (!agent) return 'Unassigned';
        
        // Handle multi-manager cases like "BRYTON + CARRINGTON"
        const managers = agent.split('+').map(m => m.trim());
        return managers.map(m => {
            const lower = m.toLowerCase();
            if (lower.includes('carrington')) return 'Carrington';
            if (lower.includes('bryton')) return 'Bryton';
            if (lower.includes('sven')) return 'Sven';
            return m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
        }).join(' + ');
    }

    // Determine group based on manager
    determineGroup(agent) {
        if (!agent) return 'Unassigned';
        const lower = agent.toLowerCase();
        
        // Staff managers
        if (lower.includes('carrington') && !lower.includes('+')) return 'Staff';
        
        // Agent managers or co-managed
        if (lower.includes('bryton') || lower.includes('sven') || lower.includes('+')) return 'Agents';
        
        return 'Staff';
    }

    // Load data from CSV file
    async loadFromCSV() {
        try {
            const response = await fetch(this.csvUrl);
            if (!response.ok) throw new Error('Failed to load CSV');
            
            const csvText = await response.text();
            this.creators = this.parseCSVData(csvText);
            this.lastFetch = new Date();
            
            console.log(`✅ Loaded ${this.creators.length} creators from CSV`);
            return this.creators;
        } catch (error) {
            console.error('❌ Error loading CSV:', error);
            // Fallback to embedded data if available
            return this.loadFallbackData();
        }
    }

    // Fallback to embedded data
    loadFallbackData() {
        if (typeof allCreatorsData !== 'undefined') {
            // Merge existing data with rewards if available
            this.creators = allCreatorsData.map(c => ({
                ...c,
                rewards: c.rewards || { earned: 0, gifted: 0, bonus: 0, running: 0, unlocked: 0 },
                lastUpdated: new Date().toISOString()
            }));
            return this.creators;
        }
        return [];
    }

    // Get all creators
    getAllCreators() {
        return this.creators;
    }

    // Get creator by username
    getCreatorByUsername(username) {
        return this.creators.find(c => c.username === username);
    }

    // Get creators by manager
    getCreatorsByManager(manager) {
        return this.creators.filter(c => 
            c.manager && c.manager.toLowerCase().includes(manager.toLowerCase())
        );
    }

    // Get creators by group
    getCreatorsByGroup(group) {
        return this.creators.filter(c => c.group === group);
    }

    // Get unique managers list
    getUniqueManagers() {
        const managers = new Set();
        this.creators.forEach(c => {
            if (c.manager) {
                // Split multi-managers
                c.manager.split('+').forEach(m => managers.add(m.trim()));
            }
        });
        return Array.from(managers).sort();
    }

    // Calculate totals
    calculateTotals() {
        let totalDiamonds = 0;
        let totalHours = 0;
        let totalStreams = 0;
        let totalEarned = 0;
        let totalGifted = 0;
        let totalBonus = 0;
        
        const staffCount = this.creators.filter(c => c.group === 'Staff').length;
        const agentsCount = this.creators.filter(c => c.group === 'Agents').length;

        this.creators.forEach(c => {
            totalDiamonds += c.diamonds || 0;
            totalHours += c.hours || 0;
            totalStreams += c.liveStreams || 0;
            totalEarned += c.rewards?.earned || 0;
            totalGifted += c.rewards?.gifted || 0;
            totalBonus += c.rewards?.bonus || 0;
        });

        return {
            totalCreators: this.creators.length,
            totalDiamonds,
            totalHours: totalHours.toFixed(1),
            totalStreams,
            totalEarned,
            totalGifted,
            totalBonus,
            staffCount,
            agentsCount
        };
    }

    // Get top creators by diamonds
    getTopCreators(limit = 10) {
        return [...this.creators]
            .sort((a, b) => (b.diamonds || 0) - (a.diamonds || 0))
            .slice(0, limit);
    }

    // Get top creators by rewards earned
    getTopEarners(limit = 10) {
        return [...this.creators]
            .sort((a, b) => (b.rewards?.earned || 0) - (a.rewards?.earned || 0))
            .slice(0, limit);
    }
}

// Create global instance
const taboostData = new TaboostDataService();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TaboostDataService, taboostData };
}
