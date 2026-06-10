// Taboost Events Calendar Data
// Upcoming events, cyphers, and agency activities

// UK: no US events — intentionally empty
const taboostEvents = [];

// Helper function to format date
function formatEventDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 7) return `In ${diffDays} days`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Get event type color
function getEventTypeColor(type) {
    const colors = {
        cypher: '#ff0044',
        challenge: '#00ff88',
        workshop: '#ffaa00',
        qa: '#0088ff',
        showcase: '#ff00ff'
    };
    return colors[type] || '#888';
}
