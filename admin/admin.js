/* ============================================================================
   TABOOST CEO Cockpit — editable config
   Marco: edit the numbers below. headcount = people on the team,
   monthlyCost = fully-loaded monthly cost for that team (salaries etc.) in USD.
   Leave a value at 0 and the card shows "Awaiting staffing data" until you fill it.
   No other file needs touching — the dashboard reads this automatically.
   ========================================================================== */
const STAFFING_CONFIG = {
  teams: [
    { name: 'Live US', headcount: 0, monthlyCost: 0 },
    { name: 'Live UK', headcount: 0, monthlyCost: 0 },
    { name: 'Shop',    headcount: 0, monthlyCost: 0 },
    { name: 'Talent',  headcount: 0, monthlyCost: 0 }
  ]
};

// expose for the cockpit's inline script (cross-script global)
window.STAFFING_CONFIG = STAFFING_CONFIG;
