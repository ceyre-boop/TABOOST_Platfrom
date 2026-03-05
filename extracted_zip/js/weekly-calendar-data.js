// Taboost Weekly Live Calendar - Auto-rotating
// Events repeat weekly, dates auto-update to current week

function getCurrentWeekRange() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate Monday of current week
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    
    // Calculate Sunday of current week
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    // Format month/day
    const formatDate = (d) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${months[d.getMonth()]} ${d.getDate()}`;
    };
    
    return {
        monday: monday,
        sunday: sunday,
        label: `${formatDate(monday)} - ${formatDate(sunday)}`,
        dates: []
    };
}

function generateWeeklySchedule() {
    const week = getCurrentWeekRange();
    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Generate dates for each day
    const schedule = days.map((dayName, index) => {
        const date = new Date(week.monday);
        date.setDate(week.monday.getDate() + index);
        
        return {
            day: dayName,
            date: `${monthNames[date.getMonth()]} ${date.getDate()}`,
            fullDate: date
        };
    });
    
    // Define recurring weekly events (day index 0-6, where 0 = Monday)
    const recurringEvents = [
        { dayIndex: 1, time: "6:00PM PT", title: "Sunday Knockout", type: "live" },      // Tuesday
        { dayIndex: 3, time: "6:00PM PT", title: "Music Cypher", type: "cypher" },      // Thursday
        { dayIndex: 6, time: "6:00PM PT", title: "Sunday Knockout", type: "live" }       // Sunday
    ];
    
    // Add events to schedule
    schedule.forEach((day, index) => {
        day.events = recurringEvents
            .filter(evt => evt.dayIndex === index)
            .map(evt => ({
                time: evt.time,
                title: evt.title,
                type: evt.type
            }));
    });
    
    return {
        currentWeek: week.label,
        weeklySchedule: schedule,
        taboostCampaigns: [
            {
                name: "Open Registration",
                tag: "@tiktok-live",
                status: "Hot Campaign",
                color: "#ff0044"
            }
        ],
        tiktokCampaigns: [
            { name: "CN Showdown", dates: "Ongoing" },
            { name: "A Sound Match: LIVE Music", dates: "Ongoing" }
        ]
    };
}

// Generate the calendar data
const weeklyCalendar = generateWeeklySchedule();
