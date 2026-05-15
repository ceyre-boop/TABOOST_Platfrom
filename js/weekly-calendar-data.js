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
            // Recurring every Tuesday
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
            id: 4,
            title: "Bunny's Wishes",
            type: "special",
            time: "All Day",
            startDate: createLocalDate('2026-04-01'),
            endDate: createLocalDate('2026-04-13'),
            color: "#ff66b2"
        },
        {
            id: 5,
            title: "Creator Spotlight",
            type: "special",
            time: "All Day",
            startDate: createLocalDate('2026-04-02'),
            endDate: createLocalDate('2026-04-13'),
            color: "#ffcc00"
        },
        {
            id: 6,
            title: "Fan Club Loyalty League",
            type: "special",
            time: "All Day",
            startDate: createLocalDate('2026-04-02'),
            endDate: createLocalDate('2026-04-17'),
            color: "#ff3300"
        },
        {
            id: 7,
            title: "Blooming Beats: LIVE Music",
            type: "special",
            time: "All Day",
            startDate: createLocalDate('2026-04-03'),
            endDate: createLocalDate('2026-04-12'),
            color: "#cc33ff"
        },
        {
            id: 8,
            title: "Easter Egg-stravaganza",
            type: "special",
            time: "All Day",
            startDate: createLocalDate('2026-04-03'),
            endDate: createLocalDate('2026-04-12'),
            color: "#33cc33"
        },
        {
            id: 9,
            title: "Live Workshop",
            type: "special",
            time: "All Day",
            startDate: createLocalDate('2026-04-02'),
            endDate: createLocalDate('2026-04-26'),
            color: "#3399ff"
        },
        {
            id: 10,
            title: "A Tiny Diny World",
            type: "special",
            time: "All Day",
            startDate: createLocalDate('2026-05-03'),
            endDate: createLocalDate('2026-05-31'),
            color: "#ff9933"
        },
        {
            id: 11,
            title: "CN Showdown (World Cup)",
            type: "special",
            time: "All Day",
            startDate: createLocalDate('2026-04-22'),
            endDate: createLocalDate('2026-04-30'),
            color: "#00ccff"
        },
        {
            id: 12,
            title: "Creator Career Program (T3/4)",
            type: "live",
            time: "All Day",
            startDate: createLocalDate('2026-05-01'),
            endDate: createLocalDate('2026-05-31'),
            color: "#ff0044"
        },
        {
            id: 13,
            title: "Creator Career Program (T5/6)",
            type: "live",
            time: "All Day",
            startDate: createLocalDate('2026-05-01'),
            endDate: createLocalDate('2026-05-31'),
            color: "#ff3366"
        },
        {
            id: 14,
            title: "Hot Stream Summer (T3-5)",
            type: "live",
            time: "All Day",
            startDate: createLocalDate('2026-05-01'),
            endDate: createLocalDate('2026-06-01'),
            color: "#ff6600"
        },
        {
            id: 15,
            title: "Hot Stream Summer (T7/8)",
            type: "live",
            time: "All Day",
            startDate: createLocalDate('2026-05-01'),
            endDate: createLocalDate('2026-06-01'),
            color: "#ff884d"
        },
        {
            id: 16,
            title: "Crece con tu Equipo",
            type: "live",
            time: "All Day",
            startDate: createLocalDate('2026-05-05'),
            endDate: createLocalDate('2026-05-17'),
            color: "#00b894"
        },
        {
            id: 17,
            title: "All Summer Sound",
            type: "live",
            time: "All Day",
            startDate: createLocalDate('2026-05-01'),
            endDate: createLocalDate('2026-05-31'),
            color: "#00ccff"
        },
        {
            id: 18,
            title: "Guest Mission",
            type: "live",
            time: "All Day",
            startDate: createLocalDate('2026-04-22'),
            endDate: createLocalDate('2026-05-20'),
            color: "#aa88ff"
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
                name: "Creator Career Program (T3/4)",
                dates: "May 1 - May 31"
            },
            {
                name: "Creator Career Program (T5/6)",
                dates: "May 1 - May 31"
            },
            {
                name: "Hot Stream Summer (T3-5)",
                dates: "May 1 - Jun 1"
            },
            {
                name: "Hot Stream Summer (T7/8)",
                dates: "May 1 - Jun 1"
            },
            {
                name: "Crece con tu Equipo",
                dates: "May 5 - May 17"
            },
            {
                name: "All Summer Sound",
                dates: "May 1 - May 31"
            },
            {
                name: "Guest Mission",
                dates: "Apr 22 - May 20"
            },
            {
                name: "A Tiny Diny World",
                dates: "May 3 - May 31"
            },
            {
                name: "My LIVE My Story",
                dates: "May 5 - Jun 5"
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
