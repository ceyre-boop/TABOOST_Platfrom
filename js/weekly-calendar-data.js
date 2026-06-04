// Taboost 3x3 Rolling Calendar - Top-left is always today
// Supports multi-day events

function generateRollingCalendar() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const createLocalDate = (dateString) => {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    };
    
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
            title: "Royal Rumble",
            type: "live",
            time: "6:00PM PT",
            recurring: { dayOfWeek: 2 }, // Tuesday
            color: "#ff0044"
        },
        {
            id: 2,
            title: "Music Cypher",
            type: "live",
            time: "6:00PM PT",
            recurring: { dayOfWeek: 4 }, // Thursday
            color: "#ff0044"
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
            id: 19,
            title: "My LIVE My Story",
            type: "live",
            time: "All Day",
            startDate: createLocalDate('2026-05-05'),
            endDate: createLocalDate('2026-06-05'),
            color: "#ffd166"
        },
        {
            id: 20,
            title: "Deals For You Days",
            type: "campaign",
            time: "All Day",
            startDate: createLocalDate('2026-06-17'),
            endDate: createLocalDate('2026-07-02'),
            color: "#ffcc00"
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
                name: "",
                tag: "SIGN UP on DISCORD",
                tagLink: "https://discord.gg/Akfwz536BW",
                status: "",
                color: "#ff0044"
            }
        ],
        tiktokCampaigns: [
            {
                name: "LIVE League S3",
                dates: "May 28 - Jun 8"
            },
            {
                name: "One World One Sound",
                dates: "Jun 1 - Jun 10"
            },
            {
                name: "Laugh Now",
                dates: "Jun 1 - Jun 9"
            },
            {
                name: "My LIVE My Story",
                dates: "May 5 - Jun 5"
            },
            {
                name: "Deals For You Days",
                dates: "Jun 17 - Jul 2"
            }
        ]
    };
}

// Generate the calendar data
const rollingCalendar = generateRollingCalendar();

// Also export for use in updateEventsCalendar function
function getRollingCalendarData() {
    return generateRollingCalendar();
}
