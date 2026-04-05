// Taboost Agency - Data Service
// Uses taboostData from js/data.js

class TaboostDataService {
    constructor() {
        this.creators = [];
        this.lastFetch = null;
    }

    async loadFromCSV() {
        if (typeof taboostData !== 'undefined') {
            this.creators = taboostData.getAllCreators();
            this.lastFetch = new Date();
            console.log('✅ Loaded', this.creators.length, 'creators from data.js');
        } else {
            console.error('❌ taboostData not found');
            this.creators = [];
        }
        return this.creators;
    }

    getAllCreators() {
        return this.creators;
    }

    getCreatorByUsername(username) {
        return this.creators.find(c => c.username.toLowerCase() === username.toLowerCase());
    }

    // Backward compatibility
    setSheetUrl(url) {
        console.log('Sheet URL (no-op):', url);
    }
}

const sheetsDataService = new TaboostDataService();
