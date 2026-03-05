// Taboost Weekly Live Calendar
// Shows week-by-week schedule with daily events

const weeklyCalendar = {
    currentWeek: "February 23 - March 1",
    taboostCampaigns: [
        {
            name: "Open Registration",
            tag: "@tiktok-live",
            status: "Hot Campaign",
            color: "#ff0044"
        }
    ],
    weeklySchedule: [
        {
            day: "MONDAY",
            date: "Feb 23",
            events: []
        },
        {
            day: "TUESDAY",
            date: "Feb 24",
            events: [
                { time: "6:00PM PT", title: "Sunday Knockout", type: "live" }
            ]
        },
        {
            day: "WEDNESDAY",
            date: "Feb 25",
            events: []
        },
        {
            day: "THURSDAY",
            date: "Feb 26",
            events: [
                { time: "6:00PM PT", title: "Music Cypher", type: "cypher" }
            ]
        },
        {
            day: "FRIDAY",
            date: "Feb 27",
            events: []
        },
        {
            day: "SATURDAY",
            date: "Feb 28",
            events: []
        },
        {
            day: "SUNDAY",
            date: "Mar 1",
            events: [
                { time: "6:00PM PT", title: "Sunday Knockout", type: "live" }
            ]
        }
    ],
    tiktokCampaigns: [
        { name: "CN Showdown", dates: "Feb 20 to 28" },
        { name: "A Sound Match: LIVE Music", dates: "Feb 21 to 28" }
    ]
};

// Next week preview (auto-rotate or manual update)
const upcomingWeeks = [
    {
        week: "March 2 - March 8",
        highlight: "Monthly Music Cypher"
    },
    {
        week: "March 9 - March 15",
        highlight: "Diamond Rush Challenge"
    }
];
