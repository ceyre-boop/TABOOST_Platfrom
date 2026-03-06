// Taboost Agency - Google Sheets Data Integration
// Fetches live data from Marco's view-only sheet

class TaboostDataService {
    constructor() {
        // Google Sheet published CSV URL - Marco needs to publish and paste URL here
        // Instructions: File → Share → Publish to web → Select sheet → CSV → Copy URL
        this.csvUrl = localStorage.getItem('taboost_sheet_url') || './data/live-data-current.csv';
        
        this.creators = [];
        this.lastFetch = null;
    }
    
    // Set the Google Sheets CSV URL
    setSheetUrl(url) {
        this.csvUrl = url;
        localStorage.setItem('taboost_sheet_url', url);
        console.log('Google Sheets URL set:', url);
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
        // Handle different line endings
        const normalizedText = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        const lines = normalizedText.trim().split('\n');
        console.log('DEBUG - Total lines:', lines.length);
        if (lines.length < 2) {
            console.log('DEBUG - Not enough lines');
            return [];
        }

        const headers = this.parseCSVLine(lines[0]);
        console.log('DEBUG - Headers count:', headers.length);
        console.log('DEBUG - First 10 headers:', headers.slice(0, 10));
        const creators = [];

        // Debug first data row
        const firstDataRow = this.parseCSVLine(lines[1]);
        console.log('DEBUG - First data row values count:', firstDataRow.length);
        console.log('DEBUG - First data row first 5 values:', firstDataRow.slice(0, 5));

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            if (values.length < 5) {
                console.log(`DEBUG - Row ${i} skipped, length:`, values.length);
                continue;
            }

            const creator = this.mapRowToCreator(headers, values);
            if (creator) {
                creators.push(creator);
            } else {
                console.log(`DEBUG - Row ${i} mapRowToCreator returned null`);
            }
        }

        console.log('DEBUG - Total creators parsed:', creators.length);
        return creators;
    }

    // Map CSV row to creator object
    mapRowToCreator(headers, values) {
        const getValue = (name) => {
            const idx = headers.indexOf(name);
            return idx >= 0 ? values[idx] : '';
        };

        // TikTok username is in column C (header '3/1' in current CSV format)
        const username = getValue('3/1') || getValue('TikTok');
        if (!username) return null;

        return {
            rank: parseInt(getValue('Rank')) || 0,
            creatorId: getValue('Host'),
            username: username,
            level: parseInt(getValue('Level')) || 0,
            _levelHeader: headers.indexOf('Level'),
            _levelValue: getValue('Level'),
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
            
            // Performance metrics - column T (19) = dY'Z, column U (20) = dY'Z Pace
            diamonds: values[19] ? this.formatNumber(values[19]) : 0,
            diamondsLast30: values[20] ? this.formatNumber(values[20]) : 0,
            _diamondsRaw: values[19],
            _levelRaw: values[4],
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
            tier: parseInt(getValue('Tier') !== '' ? getValue('Tier') : values[21]) ?? 0, // Column V - Tier (1-10, blank if 0)
            lastMonthTier: parseInt(getValue('Last Month Tier') !== '' ? getValue('Last Month Tier') : values[25]) ?? null, // Column Z - Last Month's Tier
            score: parseInt(getValue('Score')) || 0,
            _scoreDebug: getValue('Score'),
            graduationLeft: getValue('Grad Left'),
            rankUpReward: parseInt(getValue('Rank_up_Reward')) || 0,
            growthDirection: getValue('Growth') || '',
            
            // Historical data
            diamondsLastMonth: this.formatNumber(getValue('-1 Month 💎')),
            diamondsTwoMonthsAgo: this.formatNumber(getValue('-2 Month 💎')),
            
            // Labels & links
            rankLabel: getValue('Rank Label'),
            detailsLabel: getValue('Details Label'),
            link: getValue('Link'),
            diamondLabel: getValue('Diamond Label'),
            lastLabel: getValue('Last Label'),
            lastReward: getValue('Last Reward') || getValue('AQ') || '',
            
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

    // Load data from CSV file (Google Sheets or local)
    async loadFromCSV() {
        try {
            console.log('Fetching data from:', this.csvUrl);
            const response = await fetch(this.csvUrl);
            if (!response.ok) throw new Error('Failed to load CSV: ' + response.status);
            
            const csvText = await response.text();
            console.log('DEBUG - CSV loaded, length:', csvText.length);
            
            // Check if we got valid CSV data (should have commas and newlines)
            if (!csvText.includes(',') || csvText.length < 100) {
                throw new Error('Invalid CSV data received');
            }
            
            this.creators = this.parseCSVData(csvText);
            this.lastFetch = new Date();
            console.log('✅ Successfully loaded', this.creators.length, 'creators from Google Sheets');
            
            console.log(`✅ Loaded ${this.creators.length} creators from CSV`);
            if (this.creators.length > 0) {
                console.log('DEBUG - First creator:', this.creators[0].username, 'Score:', this.creators[0].score);
            }
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
