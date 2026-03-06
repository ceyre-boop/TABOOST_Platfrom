// Taboost 3x3 Rolling Calendar - Top-left is always today
// Supports multi-day events

function generateRollingCalendar() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    // Generate 9 days starting from today (3x3 grid)
    const days = [];
    for (let i = 0; i < 9; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        days.push({
            dayName: dayNames[date.getDay()],
            date: `${monthNames[date.getMonth()]} ${date.getDate()}`,
            fullDate: date,
            isToday: i === 0,
            events: []
        });
    }
    
    // Define events with start/end dates (can span multiple days)
    const events = [
        {
            id: 1,
            title: "Sunday Knockout",
            type: "live",
            time: "6:00PM PT",
            // Recurring every Tuesday (day 2 in our 3x3 if it falls there)
            recurring: { dayOfWeek: 2 }, // Tuesday
            color: "#ff0044"
        },
        {
            id: 2,
            title: "Music Cypher",
            type: "cypher",
            time: "6:00PM PT",
            recurring: { dayOfWeek: 4 }, // Thursday
            color: "#00d4ff"
        },
        {
            id: 3,
            title: "Sunday Knockout",
            type: "live",
            time: "6:00PM PT",
            recurring: { dayOfWeek: 0 }, // Sunday
            color: "#ff0044"
        },
        {
            id: 4,
            title: "Multi-Day Campaign",
            type: "campaign",
            // Example multi-day event
            startDate: new Date(2026, 2, 8), // March 8
            endDate: new Date(2026, 2, 10),  // March 10
            color: "#00ff88"
        }
    ];
    
    // Add events to days
    days.forEach(day => {
        events.forEach(event => {
            // Check recurring events
            if (event.recurring) {
                if (day.fullDate.getDay() === event.recurring.dayOfWeek) {
                    day.events.push({
                        title: event.title,
                        type: event.type,
                        time: event.time,
                        color: event.color,
                        isMultiDay: false
                    });
                }
            }
            // Check specific date range events (multi-day)
            if (event.startDate && event.endDate) {
                const dayTime = day.fullDate.getTime();
                const startTime = event.startDate.getTime();
                const endTime = event.endDate.getTime();
                
                if (dayTime >= startTime && dayTime <= endTime) {
                    day.events.push({
                        title: event.title,
                        type: event.type,
                        time: dayTime === startTime ? 'Starts' : dayTime === endTime ? 'Ends' : 'Ongoing',
                        color: event.color,
                        isMultiDay: true,
                        isStart: dayTime === startTime,
                        isEnd: dayTime === endTime
                    });
                }
            }
        });
    });
    
    return {
        currentDateRange: `${days[0].date} - ${days[8].date}`,
        days: days,
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
const rollingCalendar = generateRollingCalendar();

// Also export for use in updateEventsCalendar function
function getRollingCalendarData() {
    return generateRollingCalendar();
}