// Creator Dashboard - Personal Analytics
// Tracks creators by Creator ID (internal), displays by username

let myData = null;
let allCreators = [];
let performanceChart = null;
let creatorMonths = {}; // Real month data from CSV column F
let creatorIdMap = {}; // Map creatorId to creator data

async function initCreatorDashboard(user) {
    await taboostData.loadFromCSV();
    allCreators = taboostData.getAllCreators();
    
    // Build Creator ID lookup map (internal tracking)
    // Creator ID is in the data (column B = Host)
    creatorIdMap = {};
    allCreators.forEach(c => {
        // Use creatorId if available, otherwise try to extract from data
        const cid = c.creatorId || c._creatorId || c.id;
        if (cid) {
            creatorIdMap[cid] = c;
        }
    });
    
    // Load real month data from CSV (column F)
    await loadCreatorMonths();
    
    // Load Tier and Score badges from CSV (columns U and AF)
    await loadCreatorBadges();
    
    // Load real 6-month historical trends
    await loadCreatorTrends();
    
    // Load detailed rewards from rewards-history.csv
    detailedRewardsData = await loadDetailedRewards();
    console.log('DEBUG - Detailed rewards loaded for', Object.keys(detailedRewardsData).length, 'creators');
    
    // Find my data - first try by Creator ID, then fallback to username
    // In production, user.id would be the Creator ID from login
    let creatorId = user.creatorId || user.id;
    console.log('DEBUG - Looking for creatorId:', creatorId, 'user.name:', user.name);
    
    if (creatorId && creatorIdMap[creatorId]) {
        myData = creatorIdMap[creatorId];
        console.log('DEBUG - Found by creatorId:', myData.username, 'Score:', myData.score);
    } else {
        // Fallback: try to match by username
        myData = allCreators.find(c => 
            c.username.toLowerCase() === user.name.toLowerCase().replace(' ', '')
        ) || allCreators.find(c => c.username === 'singleonthemove') || allCreators[0];
        console.log('DEBUG - Found by fallback:', myData.username, 'Score:', myData.score, 'creatorId:', myData.creatorId);
    }
    
    // DEBUG: Log goal values
    console.log('DEBUG - Goals for', myData.username, ':', 
        'daysGoal=' + myData.daysGoal, 
        'hoursGoal=' + myData.hoursGoal, 
        'tierGoal=' + myData.tierGoal, 
        'diamondsGoal=' + myData.diamondsGoal,
        'diamonds=' + myData.diamonds
    );
    
    // Store creatorId for internal tracking (never displayed)
    myData._creatorId = myData.creatorId;
    
    try {
        console.log('DEBUG - Starting updateProfile');
        updateProfile(user);
        console.log('DEBUG - Starting updateStats');
        updateStats();
        console.log('DEBUG - Starting updateGoals');
        updateGoals();
        console.log('DEBUG - Starting updateRank');
        updateRank();
        console.log('DEBUG - Starting updateActivityStats');
        updateActivityStats();
        console.log('DEBUG - Starting updateScoreAndLevels');
        updateScoreAndLevels();
        console.log('DEBUG - Starting initPerformanceChart');
        initPerformanceChart();
        console.log('DEBUG - Starting updateAchievements');
        updateAchievements();
        console.log('DEBUG - Starting updateHistory');
        updateHistory();
        console.log('DEBUG - Starting updateAwards');
        updateAwards();
        console.log('DEBUG - Starting updateEventsCalendar');
        updateEventsCalendar();
    } catch (e) {
        console.error('ERROR in dashboard update:', e);
    }
    
    // Update footer manager
    document.getElementById('footerManager').textContent = myData.manager || 'your manager';
    
    // Update last updated timestamp
    updateLastUpdated();
}

function updateLastUpdated() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
    const dateStr = now.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
    });
    document.getElementById('lastUpdatedTime').textContent = `${dateStr} at ${timeStr}`;
}

// Load real month data from CSV (column F - Month)
async function loadCreatorMonths() {
    try {
        const response = await fetch('data/creator_months.json');
        creatorMonths = await response.json();
    } catch (e) {
        console.error('Failed to load creator months:', e);
        creatorMonths = {};
    }
}

// Load Tier and Score data from CSV (columns U and AF)
let creatorBadges = {};
async function loadCreatorBadges() {
    try {
        const response = await fetch('data/creator_badges.json');
        creatorBadges = await response.json();
    } catch (e) {
        console.error('Failed to load creator badges:', e);
        creatorBadges = {};
    }
}

function formatNumber(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
}

function formatNumberPlain(num) {
    // Format without K/M suffix - for rewards
    if (!num) return '0';
    return parseInt(num).toLocaleString();
}

function formatUSD(diamonds) {
    const usd = (diamonds || 0) * 0.005;
    return '$' + usd.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function updateProfile(user) {
    document.getElementById('creatorName').textContent = myData.username;
    document.getElementById('creatorAvatar').textContent = myData.username.charAt(0).toUpperCase();
    
    // Use REAL month data from CSV column F (creatorMonths)
    // Lookup by Creator ID (internal), not username
    const creatorId = myData.creatorId || myData._creatorId;
    const months = creatorMonths[creatorId] || parseInt(myData.month) || 0;
    
    // Format: "Member for X months" or "Member for X years Y months"
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    
    let memberText = '';
    if (years > 0 && remainingMonths > 0) {
        memberText = `Member for ${years} year${years > 1 ? 's' : ''} ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`;
    } else if (years > 0) {
        memberText = `Member for ${years} year${years > 1 ? 's' : ''}`;
    } else {
        memberText = `Member for ${months} month${months !== 1 ? 's' : ''}`;
    }
    
    document.getElementById('joinDate').textContent = memberText;
    
    // Get real Tier from creator_badges and Score directly from myData (column AG)
    const badgeData = creatorBadges[creatorId] || {};
    // Tier can be 0-5, check if defined not just truthy
    const tier = (badgeData.tier !== undefined && badgeData.tier !== null && badgeData.tier !== '') ? badgeData.tier : (myData.tier ?? '-');
    const score = myData.score || 0; // Use score directly from CSV (column AG)
    
    console.log('DEBUG - Profile Score:', score, 'Tier:', tier, 'Creator:', myData.username);
    
    // Manager pill with Discord link
    const managerName = myData.manager || 'Not assigned';
    document.getElementById('managerName').textContent = managerName;
    
    // Discord links for managers
    const managerDiscordLinks = {
        'carrington': 'https://discord.com/users/953826604260417617',
        'levi': 'https://discord.com/users/463575386010157057',
        'marco': 'sms:13235787155',  // Marco uses SMS
        // Add more managers here
    };
    
    const managerKey = managerName.toLowerCase().trim();
    const managerPill = document.getElementById('managerPill');
    const managerIcon = managerPill.querySelector('.fa-user-tie');
    
    if (managerDiscordLinks[managerKey]) {
        managerPill.href = managerDiscordLinks[managerKey];
        managerPill.style.cursor = 'pointer';
        managerPill.style.opacity = '1';
        
        // Update icon based on link type
        if (managerDiscordLinks[managerKey].startsWith('sms:')) {
            managerPill.title = 'Text manager via SMS';
            managerIcon.className = 'fas fa-sms';
        } else if (managerDiscordLinks[managerKey].includes('discord')) {
            managerPill.title = 'Message manager on Discord';
            managerIcon.className = 'fab fa-discord';
        }
    } else {
        managerPill.href = '#';
        managerPill.style.cursor = 'default';
        managerPill.style.opacity = '0.7';
        managerPill.title = 'Manager contact not available';
    }
    
    // Badges - Level (0-5), Tier (col V), Score (col AG)
    // Level: only show if it's a valid number greater than 0
    let levelDisplay = '--';
    if (myData.level && !isNaN(myData.level) && myData.level > 0) {
        levelDisplay = myData.level;
    }
    document.getElementById('creatorBadges').innerHTML = `
        <span class="badge badge-level">Level ${levelDisplay}</span>
        <span class="badge badge-tier">Tier ${tier}</span>
        <span class="badge badge-score">Score ${score}</span>
    `;
    
    // Welcome message based on performance
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12) greeting = 'Good afternoon';
    if (hour >= 18) greeting = 'Good evening';
    
    const growth = parseFloat(myData.growthPercent) || 0;
    let message = 'Check out your latest earnings and goals.';
    if (growth > 20) message = '🚀 Amazing growth this month! Keep it up!';
    else if (growth < 0) message = 'Your numbers are down. Let\'s get back on track!';
    else if ((myData.hours || 0) < 40) message = 'You\'re behind on hours. Time to stream!';
    
    document.getElementById('welcomeTitle').textContent = `${greeting}, ${myData.username}!`;
    document.getElementById('welcomeMessage').textContent = message;
}

function getTier(diamonds) {
    if (diamonds >= 2000000) return 'Platinum';
    if (diamonds >= 1000000) return 'Gold';
    if (diamonds >= 500000) return 'Silver';
    return 'Bronze';
}

function updateStats() {
    // Current diamonds
    console.log('DEBUG - myData:', myData);
    console.log('DEBUG - Diamonds:', myData.diamonds, 'Raw:', myData._diamondsRaw);
    console.log('DEBUG - Level:', myData.level, 'Raw:', myData._levelRaw);
    document.getElementById('currentDiamonds').textContent = formatNumber(myData.diamonds) + ' 💎';
    document.getElementById('currentUSD').textContent = '≈ ' + formatUSD(myData.diamonds);
    
    // Growth trend - calculate if not provided
    let growth = parseFloat(myData.growthPercent);
    if (!growth && myData.diamonds && myData.diamondsLastMonth) {
        // Calculate growth: (current - last) / last * 100
        growth = ((myData.diamonds - myData.diamondsLastMonth) / myData.diamondsLastMonth) * 100;
    }
    growth = growth || 0;
    
    const trendEl = document.getElementById('diamondTrend');
    trendEl.innerHTML = `
        <span class="trend-indicator ${growth >= 0 ? 'up' : 'down'}">
            <i class="fas fa-arrow-${growth >= 0 ? 'up' : 'down'}"></i>
            ${Math.abs(growth).toFixed(1)}% vs last month
        </span>
    `;
    
    // Rewards - Calculate from import file (Column G - Column H)
    let importRewardsTotal = 0;
    let importGiftedTotal = 0;
    let rowCount = 0;
    
    const username = myData.username?.toLowerCase();
    console.log('DEBUG - Calculating rewards for:', username);
    console.log('DEBUG - detailedRewardsData loaded:', detailedRewardsData ? 'YES' : 'NO');
    
    if (detailedRewardsData && username && detailedRewardsData[username]) {
        const myRewards = detailedRewardsData[username];
        rowCount = myRewards.length;
        console.log('DEBUG - Found', rowCount, 'records for', username);
        
        myRewards.forEach((r, idx) => {
            // Clean and parse values
            const rewardsRaw = (r.rewards || '0').toString().replace(/,/g, '').trim();
            const giftedRaw = (r.gifted || '0').toString().replace(/,/g, '').trim();
            
            const rewardAmount = parseInt(rewardsRaw) || 0;
            const giftedAmount = parseInt(giftedRaw) || 0;
            
            // Only count positive values
            if (rewardAmount > 0) importRewardsTotal += rewardAmount;
            if (giftedAmount > 0) importGiftedTotal += giftedAmount;
            
            // Show ALL rows in console for verification
            console.log(`Row ${idx}: ${r.type} | Date:${r.date} | G:"${r.rewards}"=${rewardAmount} | H:"${r.gifted}"=${giftedAmount}`);
        });
        
        console.log('CALCULATION SUMMARY for ' + username);
        console.log('  Total Rows: ' + rowCount);
        console.log('  Column G (Rewards) Sum: ' + importRewardsTotal);
        console.log('  Column H (Gifted) Sum: ' + importGiftedTotal);
        console.log('  Available (G-H): ' + (importRewardsTotal - importGiftedTotal));
    } else {
        console.log('DEBUG - No rewards data found for:', username);
    }
    
    // Current Available = Column G total - Column H total (minimum 0, no max)
    const rawAvailable = importRewardsTotal - importGiftedTotal;
    const currentAvailable = Math.max(0, rawAvailable);
    const currentRewardsAvailable = formatNumberPlain(currentAvailable);
    
    // Total Earned = Column G total from import
    const totalEarned = importRewardsTotal;
    
    console.log('DISPLAY: Available=' + currentRewardsAvailable + ' | Total Earned=' + formatNumberPlain(totalEarned));
    
    document.getElementById('totalRewards').textContent = currentRewardsAvailable;
    document.getElementById('rewardsBreakdown').innerHTML = `
        <span>Total Earned: ${formatNumberPlain(totalEarned)} | Used: ${formatNumberPlain(importGiftedTotal)}</span>
    `;
}

function updateRank() {
    const sorted = [...allCreators].sort((a, b) => (b.diamonds || 0) - (a.diamonds || 0));
    const myRank = sorted.findIndex(c => c.username === myData.username) + 1;
    
    document.getElementById('currentRank').textContent = '#' + myRank;
    document.getElementById('totalCreators').textContent = allCreators.length;
    
    // Rank progress
    const progress = Math.max(5, 100 - (myRank / allCreators.length * 100));
    document.getElementById('rankBar').style.width = progress + '%';
    
    // Next rank goal
    if (myRank > 1) {
        const nextCreator = sorted[myRank - 2];
        const gap = (nextCreator.diamonds || 0) - (myData.diamonds || 0);
        const targetRank = myRank - 1;
        document.getElementById('rankGoal').textContent = formatNumber(gap) + ' more diamonds to reach #' + targetRank;
    } else {
        document.getElementById('rankGoal').textContent = "You're #1! Keep crushing it! 🔥";
    }
}

function updateActivityStats() {
    // Activity Stats Row may have been removed - safely check all elements
    try {
        const hoursValue = document.getElementById('hoursValue');
        if (hoursValue) hoursValue.textContent = (myData.hours || 0).toFixed(1) + 'h';
        
        const streamsValue = document.getElementById('streamsValue');
        if (streamsValue) streamsValue.textContent = myData.liveStreams || 0;
        
        const daysValue = document.getElementById('daysValue');
        if (daysValue) daysValue.textContent = myData.validLiveDays || 0;
        
        // Calculate hourly rate (diamonds per hour)
        const hours = myData.hours || 0;
        const diamonds = myData.diamonds || 0;
        const hourlyRate = hours > 0 ? Math.round(diamonds / hours) : 0;
        const hourlyRateValue = document.getElementById('hourlyRateValue');
        if (hourlyRateValue) hourlyRateValue.textContent = formatNumber(hourlyRate) + ' 💎/h';
        
        // Hours goal mini bar
        const hoursFill = document.getElementById('hoursFill');
        const hoursGoalText = document.getElementById('hoursGoalText');
        if (hoursFill && hoursGoalText) {
            const hourPct = Math.min(100, ((myData.hours || 0) / (myData.hoursGoal || 15)) * 100);
            hoursFill.style.width = hourPct + '%';
            hoursGoalText.textContent = (myData.hoursGoal || 15) + 'h';
        }
    } catch (e) {
        console.log('Activity Stats elements not found (may have been removed):', e.message);
    }
}

function updateGoals() {
    const daysInMonth = 30;
    const today = new Date().getDate();
    const daysLeft = daysInMonth - today;
    document.getElementById('daysRemaining').textContent = daysLeft + ' days left in month';
    
    const goals = [
        {
            name: 'Streaming Days',
            icon: 'fa-calendar',
            current: myData.validLiveDays || 0,
            target: myData.daysGoal || 7,
            unit: ' days'
        },
        {
            name: 'Hours Goal',
            icon: 'fa-clock',
            current: myData.hours || 0,
            target: myData.hoursGoal || 15,
            unit: 'h'
        },
        {
            name: 'Diamonds Target',
            icon: 'fa-gem',
            current: myData.diamondsCurrent || myData.diamonds || 0,
            target: myData.tierGoal || myData.diamondsGoal || 0,
            unit: ''
        }
    ];
    
    // DEBUG: Log goal values
    console.log('DEBUG Goals for', myData.username, ':', 
        'daysGoal=' + myData.daysGoal, 
        'hoursGoal=' + myData.hoursGoal, 
        'tierGoal=' + myData.tierGoal, 
        'diamondsGoal=' + myData.diamondsGoal,
        'liveStreams=' + myData.liveStreams
    );
    
    document.getElementById('goalsGrid').innerHTML = goals.map(g => {
        const pct = Math.min(100, (g.current / g.target) * 100);
        let status = 'at-risk';
        if (pct >= 100) status = 'on-track';
        else if (pct >= 60) status = 'on-track';
        else if (pct >= 40) status = 'behind';
        
        return `
            <div class="goal-card">
                <div class="goal-header">
                    <div class="goal-title">
                        <i class="fas ${g.icon}"></i>
                        <span>${g.name}</span>
                    </div>
                    <span class="goal-status ${status}">${status.replace('-', ' ')}</span>
                </div>
                <div class="goal-progress-bar">
                    <div class="goal-progress-fill ${status}" style="width: ${pct}%"></div>
                </div>
                <div class="goal-numbers">
                    <span>${formatNumber(g.current)}${g.unit} / ${formatNumber(g.target)}${g.unit}</span>
                    <span>${pct.toFixed(0)}%</span>
                </div>
            </div>
        `;
    }).join('');
}

// Load creator historical trends from real 6-month data
let creatorTrends = {};

// Load detailed rewards from rewards-history.csv
async function loadDetailedRewards() {
    try {
        const response = await fetch('data/rewards-history.csv?v=202503081800');
        if (!response.ok) throw new Error('Failed to load rewards file');
        
        const csvText = await response.text();
        const lines = csvText.trim().split('\n');
        const headers = lines[0].split(',');
        
        const rewardsByCreator = {};
        
        // Parse CSV properly handling quoted values with commas
        for (let i = 1; i < lines.length; i++) {
            // Better CSV parsing: handle "70,000" and empty values
            const line = lines[i];
            const values = [];
            let inQuotes = false;
            let current = '';
            
            for (let j = 0; j < line.length; j++) {
                const char = line[j];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    values.push(current.trim().replace(/^"|"$/g, ''));
                    current = '';
                } else {
                    current += char;
                }
            }
            values.push(current.trim().replace(/^"|"$/g, ''));
            
            if (values.length < 8) continue;
            
            const username = values[0]?.toLowerCase();
            const type = values[1] || '';
            const date = values[2] || '';
            
            // Column G (index 6) = Rewards, Column H (index 7) = Gifted
            const rewards = values[6] || '0';
            const gifted = values[7] || '0';
            
            if (!username) continue;
            
            if (!rewardsByCreator[username]) {
                rewardsByCreator[username] = [];
            }
            
            rewardsByCreator[username].push({
                type: type,
                date: date,
                rewards: rewards,
                gifted: gifted,
                icon: type.includes('Rumble') ? '🥊' : type.includes('Match') ? '🎵' : '🏆'
            });
        }
        
        const creatorCount = Object.keys(rewardsByCreator).length;
        console.log('DEBUG - Loaded rewards for', creatorCount, 'creators from CSV');
        console.log('DEBUG - Sample creators:', Object.keys(rewardsByCreator).slice(0, 5));
        return rewardsByCreator;
    } catch (e) {
        console.error('Failed to load detailed rewards:', e);
        return {};
    }
}

async function loadCreatorTrends() {
    try {
        const response = await fetch('data/creator_trends.json?v=2');
        if (!response.ok) throw new Error('Failed to load trends file');
        const trends = await response.json();
        creatorTrends = {};
        trends.forEach(t => {
            creatorTrends[t.username] = t;
        });
        console.log('DEBUG - Loaded trends for', Object.keys(creatorTrends).length, 'creators');
    } catch (e) {
        console.error('Failed to load trends:', e);
        creatorTrends = {};
    }
}

function initPerformanceChart() {
    console.log('DEBUG - initPerformanceChart called');
    try {
        const ctx = document.getElementById('performanceChart');
        console.log('DEBUG - Canvas element:', ctx);
        if (!ctx) {
            console.error('ERROR: performanceChart canvas not found');
            return;
        }
        
        // Force canvas to have proper dimensions
        ctx.style.width = '100%';
        ctx.style.height = '100%';
        
        // Use real 6-month data if available - try exact match first, then case-insensitive
        let trends = creatorTrends[myData.username];
        
        // If not found, try case-insensitive match
        if (!trends) {
            const usernameLower = myData.username.toLowerCase();
            const matchingKey = Object.keys(creatorTrends).find(key => 
                key.toLowerCase() === usernameLower
            );
            if (matchingKey) {
                trends = creatorTrends[matchingKey];
                console.log('DEBUG - Found trends via case-insensitive match:', matchingKey);
            }
        }
        
        console.log('DEBUG - Looking for username:', myData.username);
        console.log('DEBUG - Available usernames count:', Object.keys(creatorTrends).length);
        console.log('DEBUG - Chart trends found:', trends ? 'YES' : 'NO');
        
        const hasRealData = trends && trends.diamondsHistory && trends.diamondsHistory.length === 6;
        console.log('DEBUG - hasRealData:', hasRealData);
        
        // Generate actual month names (last 6 months)
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const today = new Date();
        const labels = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            labels.push(monthNames[d.getMonth()]);
        }
        
        // Always use 6-month view with real data or fallback
        let dataPoints;
        if (hasRealData) {
            dataPoints = trends.diamondsHistory;
            console.log('DEBUG - Using real 6-month data:', dataPoints);
        } else {
            // Fallback: use CSV data columns
            const current = myData.diamonds || 0;
            const lastMonth = myData.diamondsLastMonth || current;
            const twoMonthsAgo = myData.diamondsTwoMonthsAgo || lastMonth;
            // Use available data or create trend
            dataPoints = [
                twoMonthsAgo || current * 0.8,
                lastMonth || current * 0.9,
                current * 0.95,
                current * 0.98,
                current * 0.99,
                current
            ];
            console.log('DEBUG - Using fallback data:', dataPoints);
        }
        
        // Tier data - only show for months we have data (Feb onwards)
        // Column V = This Month's Tier, Column Z = Last Month's Tier
        // Leave as null for months before we have data (chart will skip them)
        const thisMonthTier = myData.tier;
        const lastMonthTier = myData.lastMonthTier;
        
        // Build tier array - only last 2 months have data, rest are null
        // Array order: [Month 1, Month 2, Month 3, Month 4, Month 5, This Month]
        const tierData = [null, null, null, null, lastMonthTier, thisMonthTier];
        
        console.log('DEBUG - Chart labels:', labels);
        console.log('DEBUG - Chart dataPoints:', dataPoints);
    
    const data = {
        labels: labels,
        datasets: [{
            label: 'My Diamonds',
            data: dataPoints,
            borderColor: '#ff0044',
            backgroundColor: 'rgba(255, 0, 68, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointBackgroundColor: '#ff0044',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: hasRealData ? 4 : 6,
            yAxisID: 'y'
        },
        {
            label: 'Tier',
            data: tierData,
            borderColor: '#00ff88',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#00ff88',
            yAxisID: 'y1'
        }]
    };
    
    // Destroy existing chart if it exists
    if (performanceChart) {
        performanceChart.destroy();
    }
    
    console.log('DEBUG - Creating chart with data:', data);
    
    // Detect mobile for smaller chart elements
    const isMobile = window.innerWidth < 768;
    
    performanceChart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: { 
                    display: hasRealData && !isMobile,
                    labels: { 
                        color: '#888',
                        font: { size: isMobile ? 10 : 12 }
                    }
                },
                tooltip: {
                    backgroundColor: '#1a1a1a',
                    borderColor: '#333',
                    borderWidth: 1,
                    titleColor: '#fff',
                    bodyColor: '#ccc',
                    titleFont: { size: isMobile ? 11 : 13 },
                    bodyFont: { size: isMobile ? 10 : 12 },
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.label === 'Tier') {
                                return 'Tier ' + context.parsed.y;
                            }
                            return formatNumber(context.parsed.y) + ' 💎';
                        }
                    }
                }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        color: '#888',
                        font: { size: isMobile ? 9 : 11 },
                        maxTicksLimit: isMobile ? 4 : 6,
                        callback: v => formatNumber(v)
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { display: false },
                    min: 1,
                    max: 10,
                    ticks: {
                        color: '#00ff88',
                        font: { size: 9 },
                        stepSize: 1,
                        callback: v => 'T' + v
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { 
                        color: '#888',
                        font: { size: isMobile ? 8 : 10 }
                    }
                }
            }
        }
    });
    
    // Chart tabs - only real data, no estimation
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Always show real 6-month historical data with month names
            performanceChart.data.labels = labels;
            if (hasRealData) {
                performanceChart.data.datasets[0].data = trends.diamondsHistory;
            } else {
                // Fallback: use CSV data columns
                const current = myData.diamonds || 0;
                const lastMonth = myData.diamondsLastMonth || current;
                const twoMonthsAgo = myData.diamondsTwoMonthsAgo || lastMonth;
                performanceChart.data.datasets[0].data = [
                    twoMonthsAgo || current * 0.8,
                    lastMonth || current * 0.9,
                    current * 0.95,
                    current * 0.98,
                    current * 0.99,
                    current
                ];
            }
            performanceChart.update();
        });
    });
    
    // Insights using real data
    const avg = allCreators.reduce((a, c) => a + (c.diamonds || 0), 0) / allCreators.length;
    const diff = ((myData.diamonds || 0) - avg) / avg * 100;
    
    document.getElementById('chartInsights').innerHTML = `
        <div class="insight-item ${diff >= 0 ? 'positive' : 'negative'}">
            <i class="fas fa-chart-bar"></i>
            <span>${diff >= 0 ? '+' : ''}${diff.toFixed(1)}% vs agency average</span>
        </div>
        <div class="insight-item">
            <i class="fas fa-calculator"></i>
            <span>${formatNumber((myData.diamonds || 0) / (myData.liveStreams || 1))} diamonds per stream</span>
        </div>
    `;
    
    console.log('DEBUG - Chart created successfully');
    
    // Force chart to render
    if (performanceChart) {
        performanceChart.update();
        console.log('DEBUG - Chart updated/rendered');
    }
    
    } catch (error) {
        console.error('ERROR creating chart:', error);
        const container = document.querySelector('.chart-container');
        if (container) {
            container.innerHTML = '<p style="text-align:center;color:#888;padding:40px 20px;">Chart data unavailable. Refresh to try again.</p>';
        }
    }
}

function updateAchievements() {
    const achievements = [
        { name: 'Million Diamond Club', icon: '💎', unlocked: (myData.diamonds || 0) >= 1000000, desc: '1M+ diamonds' },
        { name: 'Stream Master', icon: '📺', unlocked: (myData.validLiveDays || 0) >= 22, desc: '22+ days streamed' },
        { name: 'Reward King', icon: '💰', unlocked: (myData.diamonds || 0) >= 100000, desc: '100K+ diamonds' },
        { name: 'Hour Crusher', icon: '⏰', unlocked: (myData.hours || 0) >= 80, desc: '80+ hours' },
        { name: 'Growth Star', icon: '🚀', unlocked: (myData.growthDirection || '').toLowerCase() === 'up', desc: 'Upward growth' },
        { name: 'Top 10', icon: '👑', unlocked: false, desc: 'Reach top 10' } // Will update based on rank
    ];
    
    // Update Top 10 based on actual rank
    const sorted = [...allCreators].sort((a, b) => (b.diamonds || 0) - (a.diamonds || 0));
    const myRank = sorted.findIndex(c => c.username === myData.username) + 1;
    achievements[5].unlocked = myRank <= 10;
    
    const unlockedCount = achievements.filter(a => a.unlocked).length;
    document.getElementById('achievementCount').textContent = `${unlockedCount}/${achievements.length} unlocked`;
    
    document.getElementById('achievementsGrid').innerHTML = achievements.map(a => `
        <div class="achievement-item ${a.unlocked ? 'unlocked' : ''}">
            <div class="achievement-icon">${a.icon}</div>
            <div class="achievement-name">${a.name}</div>
            <div class="achievement-desc">${a.desc}</div>
        </div>
    `).join('');
}

function updateHistory() {
    // Generate month names (last 6 months)
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const today = new Date();
    const periods = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        periods.push(monthNames[d.getMonth()] + ' ' + d.getFullYear());
    }
    
    // Use 6-month trend data if available
    let diamondsHistory = [];
    const trends = creatorTrends[myData.username];
    if (trends && trends.diamondsHistory && trends.diamondsHistory.length === 6) {
        diamondsHistory = trends.diamondsHistory;
    } else {
        // Fallback: build from available data
        const current = myData.diamonds || 0;
        const lastMonth = myData.diamondsLastMonth || current;
        const twoMonthsAgo = myData.diamondsTwoMonthsAgo || lastMonth;
        diamondsHistory = [
            twoMonthsAgo * 0.85 || current * 0.7,
            twoMonthsAgo * 0.92 || current * 0.8,
            twoMonthsAgo || current * 0.85,
            lastMonth * 0.95 || current * 0.9,
            lastMonth || current * 0.95,
            current
        ];
    }
    
    // Build rows with calculated changes
    const rows = periods.map((period, index) => {
        const diamonds = diamondsHistory[index] || 0;
        const prevDiamonds = index > 0 ? (diamondsHistory[index - 1] || diamonds) : diamonds;
        const change = index > 0 ? ((diamonds - prevDiamonds) / prevDiamonds * 100).toFixed(1) + '%' : '--';
        
        // Rewards - only show for current month (we don't have historical rewards per month)
        const rewards = index === 5 ? formatNumber(myData.rewards?.earned || 0) : '--';
        
        return {
            period: period,
            diamonds: diamonds,
            usd: formatUSD(diamonds),
            rewards: rewards,
            change: change
        };
    });
    
    document.getElementById('historyTableBody').innerHTML = rows.map(r => {
        const changeNum = parseFloat(r.change);
        const changeClass = isNaN(changeNum) ? '' : changeNum >= 0 ? 'up' : 'down';
        const changeIcon = isNaN(changeNum) ? '' : changeNum >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
        
        return `
            <tr>
                <td><strong>${r.period}</strong></td>
                <td>${formatNumber(r.diamonds)} 💎</td>
                <td style="color: var(--success);">${r.usd}</td>
                <td>${r.rewards}</td>
                <td>
                    ${r.change !== '--' ? `
                        <span class="trend-indicator ${changeClass}">
                            <i class="fas ${changeIcon}"></i> ${r.change}
                        </span>
                    ` : '--'}
                </td>
            </tr>
        `;
    }).join('');
}

function updateScoreAndLevels() {
    // Score from Google Sheets column AG (0-100)
    const score = myData.score || 0;
    console.log('DEBUG - Creator ID:', myData.creatorId, 'Score:', score, 'from myData.score');
    
    // Update Score Badge
    document.getElementById('scoreBadge').textContent = `Score: ${score}`;
    
    // Score Segmented Bar - 100 segments, fill based on score
    // Score 86 = 86 segments filled, Score 100 = 100 segments filled
    const segmentsContainer = document.getElementById('scoreSegments');
    if (segmentsContainer) {
        // Generate 100 segments if not already generated
        if (segmentsContainer.children.length === 0) {
            for (let i = 0; i < 100; i++) {
                const segment = document.createElement('div');
                segment.className = 'score-segment';
                segmentsContainer.appendChild(segment);
            }
        }
        
        // Fill segments based on score
        const filledCount = Math.min(100, Math.max(0, Math.round(score)));
        const segments = segmentsContainer.querySelectorAll('.score-segment');
        segments.forEach((seg, index) => {
            if (index < filledCount) {
                seg.classList.add('filled');
            } else {
                seg.classList.remove('filled');
            }
        });
    }
    
    console.log(`DEBUG - Score: ${score}, Segments filled: ${Math.round(score)}`);
    
    // Current Score Reward
    const rewardTiers = [
        { min: 95, reward: 450 },
        { min: 90, reward: 300 },
        { min: 85, reward: 200 },
        { min: 80, reward: 100 },
        { min: 75, reward: 75 },
        { min: 70, reward: 75 },
        { min: 0, reward: 0 }
    ];
    
    // Score reward display removed - only showing score bar now
    
    // Score Breakdown
    const threeMonthDiamonds = (myData.diamonds || 0) + (myData.diamondsLastMonth || 0) + (myData.diamondsTwoMonthsAgo || 0);
    const growth = parseFloat(myData.growthPercent) || 0;
    
    // Activity Level based on Column U (💎 Pace)
    const pace = myData.diamondPace || 0;
    let activityLevel = 'Low';
    let activityColor = '#888';
    
    if (pace > 300000) {
        activityLevel = 'Great';
        activityColor = '#4ade80'; // Green
    } else if (pace >= 1000) {
        activityLevel = 'Good';
        activityColor = '#60a5fa'; // Blue
    } else {
        activityLevel = 'Low';
        activityColor = '#ef4444'; // Red
    }
    
    const activityEl = document.getElementById('scoreActivity');
    activityEl.textContent = activityLevel;
    activityEl.style.color = activityColor;
    document.getElementById('scoreDiamonds').textContent = formatNumber(threeMonthDiamonds);
    // Rank Change - Column Y (Tier Status: Up/Down)
    const tierStatus = myData.tierStatus || '';
    const rankChangeEl = document.getElementById('rankChange');
    
    if (tierStatus.toLowerCase().includes('up')) {
        rankChangeEl.textContent = '⬆ Up';
        rankChangeEl.style.color = '#00ff88'; // Green
    } else if (tierStatus.toLowerCase().includes('down')) {
        rankChangeEl.textContent = '⬇ Down';
        rankChangeEl.style.color = '#ff0044'; // Red
    } else {
        rankChangeEl.textContent = '➡ Same';
        rankChangeEl.style.color = '#888';
    }
    
    // Activity Level Visual - DEBUG
    console.log('DEBUG - Activity Level data:', myData.level, 'Raw:', myData._levelRaw, 'Header:', myData._levelHeader);
    
    // Use level from CSV column E, but handle 0 as unset/blank
    let currentLevel = 0;
    if (myData.level !== undefined && myData.level !== null && myData.level !== '') {
        currentLevel = parseInt(myData.level) || 0;
    }
    
    console.log('DEBUG - Parsed currentLevel:', currentLevel, 'for creator:', myData.username);
    
    document.getElementById('currentLevelBadge').textContent = `Level ${currentLevel > 0 ? currentLevel : '--'}`;
    
    // Update level steps
    document.querySelectorAll('.level-step').forEach(step => {
        const levelNum = parseInt(step.dataset.level);
        step.classList.remove('completed', 'current');
        if (currentLevel > 0 && levelNum < currentLevel) {
            step.classList.add('completed');
        } else if (levelNum === currentLevel && currentLevel > 0) {
            step.classList.add('current');
        }
    });
    
    // Current progress toward CURRENT level goal (not next level)
    const levelReqs = [
        { level: 0, days: 7, hours: 15 },
        { level: 1, days: 8, hours: 20 },
        { level: 2, days: 12, hours: 30 },
        { level: 3, days: 16, hours: 40 },
        { level: 4, days: 20, hours: 60 },
        { level: 5, days: 25, hours: 80 }
    ];
    
    // Get requirements for current level (or level 0 if not set)
    const currentLevelReq = levelReqs.find(r => r.level === currentLevel) || levelReqs[0];
    const currentDays = myData.validLiveDays || 0;
    const currentHours = myData.hours || 0;
    
    document.getElementById('daysStreamed').textContent = `${currentDays} / ${currentLevelReq.days} days`;
    document.getElementById('hoursStreamedLevel').textContent = `${currentHours.toFixed(1)} / ${currentLevelReq.hours} hrs`;
    
    document.getElementById('daysFill').style.width = `${Math.min(100, (currentDays / currentLevelReq.days) * 100)}%`;
    document.getElementById('hoursFillLevel').style.width = `${Math.min(100, (currentHours / currentLevelReq.hours) * 100)}%`;
    
    // Revenue Streams - only update elements that exist
    const diamondUSD = (myData.diamonds || 0) * 0.005;
    
    // Update Diamond Earnings (only remaining revenue item)
    const diamondRevenueEl = document.getElementById('diamondRevenue');
    if (diamondRevenueEl) {
        diamondRevenueEl.textContent = '$' + diamondUSD.toFixed(2);
    }
    
    const diamondCountEl = document.getElementById('diamondCount');
    if (diamondCountEl) {
        diamondCountEl.textContent = formatNumber(myData.diamonds) + ' 💎';
    }
    
    // Level Bonus and Score Reward removed - elements no longer exist
    console.log('DEBUG - Revenue: Diamond USD =', diamondUSD.toFixed(2));
}

// Global variable to store detailed rewards
let detailedRewardsData = {};

// Discord channel links for events
const eventDiscordLinks = {
    'Royal Rumble': 'https://discord.com/channels/958221101182382130/1376992573020700822',
    'Music Cypher': 'https://discord.com/channels/958221101182382130/1376985833327951872',
    'Music Match-Up': 'https://discord.com/channels/958221101182382130/1376985833327951872',
    'Sunday Knockout': 'https://discord.com/channels/958221101182382130/1396899485992489062',
    'Stage Takeover': 'https://discord.com/channels/958221101182382130/1376985833327951872',
    'Monthly Award': 'https://discord.com/channels/958221101182382130/1376985833327951872'
};

function updateAwards() {
    let awards = [];
    const username = myData.username?.toLowerCase();
    
    // Use detailed rewards from rewards-history.csv - prioritize AVAILABLE rewards first
    if (detailedRewardsData && username && detailedRewardsData[username]) {
        const myDetailedRewards = detailedRewardsData[username];
        
        // Parse numbers from reward strings (e.g., "5,000" -> 5000)
        const parseRewardNum = (str) => {
            if (!str) return 0;
            return parseInt(str.toString().replace(/,/g, '')) || 0;
        };
        
        // Process all rewards with availability info
        const processedRewards = myDetailedRewards.map(r => {
            const rewardsVal = r.rewards || '0';
            const giftedVal = r.gifted || '0';
            const rewardsNum = parseRewardNum(rewardsVal);
            const giftedNum = parseRewardNum(giftedVal);
            const available = rewardsNum - giftedNum;
            const hasAvailable = available > 0;
            
            return {
                icon: r.icon || '🏆',
                title: r.type,
                date: r.date,
                rewards: rewardsVal,
                gifted: giftedVal,
                available: available,
                hasAvailable: hasAvailable,
                availableFormatted: formatNumberPlain(available),
                // Parse date for sorting (MM/DD/YYYY format)
                dateObj: new Date(r.date)
            };
        });
        
        // Separate into available and used rewards
        const availableRewards = processedRewards.filter(r => r.hasAvailable);
        const usedRewards = processedRewards.filter(r => !r.hasAvailable);
        
        // Sort each group by date (newest first)
        availableRewards.sort((a, b) => b.dateObj - a.dateObj);
        usedRewards.sort((a, b) => b.dateObj - a.dateObj);
        
        // PRIORITY: Show available rewards first, then fill with most recent used rewards
        // Take up to 5 available rewards
        awards = availableRewards.slice(0, 5);
        
        // If we have fewer than 5 available, fill with most recent used rewards
        if (awards.length < 5) {
            const remainingSlots = 5 - awards.length;
            awards = awards.concat(usedRewards.slice(0, remainingSlots));
        }
        
        // Re-sort final list by date (newest first) for display
        awards.sort((a, b) => b.dateObj - a.dateObj);
    }
    
    // Default message if no rewards
    if (awards.length === 0) {
        awards = [{
            icon: '⭐',
            title: 'Keep streaming to earn rewards!',
            date: '',
            rewards: '',
            gifted: '',
            hasAvailable: false
        }];
    }
    
    document.getElementById('awardsList').innerHTML = awards.map(a => {
        const rewardsVal = a.rewards || '0';
        const giftedVal = a.gifted || '0';
        const availableVal = a.availableFormatted || '0';
        
        // Format: "5,000 total / 2,000 used / 3,000 available"
        let amountDisplay = '';
        if (rewardsVal && rewardsVal !== '0') {
            amountDisplay = `<span class="reward-total">${rewardsVal} total</span>`;
            if (giftedVal && giftedVal !== '0') {
                amountDisplay += ` <span class="reward-separator">/</span> <span class="reward-used">${giftedVal} used</span>`;
            }
            if (a.hasAvailable) {
                amountDisplay += ` <span class="reward-separator">/</span> <span class="reward-available">${availableVal} available</span>`;
            }
        }
        
        // Make event title clickable if Discord link exists
        const discordLink = eventDiscordLinks[a.title];
        const titleDisplay = discordLink 
            ? `<a href="${discordLink}" target="_blank" class="award-title-link" title="Open ${a.title} in Discord">${a.title}</a>`
            : `<div class="award-title">${a.title}</div>`;
        
        return `
        <div class="award-item ${a.hasAvailable ? 'has-available' : ''}">
            <div class="award-icon">${a.icon}</div>
            <div class="award-content">
                ${titleDisplay}
                <div class="award-date">${a.date}</div>
            </div>
            <div class="award-amount-compact">
                ${amountDisplay || '-'}
            </div>
        </div>
    `}).join('');
}

// ===== SETTINGS FUNCTIONS =====

function openSettings() {
    const modal = document.getElementById('settingsModal');
    modal.classList.add('active');
    loadSettings();
}

function closeSettings() {
    const modal = document.getElementById('settingsModal');
    modal.classList.remove('active');
}

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('creator_settings') || '{}');
    const user = JSON.parse(localStorage.getItem('taboost_user') || '{}');
    
    // Show admin section for admins
    if (user.role === 'admin') {
        const adminSection = document.getElementById('adminSection');
        if (adminSection) adminSection.style.display = 'block';
    }
    
    // Data Source
    const savedUrl = localStorage.getItem('taboost_sheet_url') || '';
    const sheetUrlInput = document.getElementById('settingSheetUrl');
    if (sheetUrlInput) sheetUrlInput.value = savedUrl;
    
    // Profile
    document.getElementById('settingDisplayName').value = settings.displayName || myData.username || '';
    document.getElementById('settingEmail').value = settings.email || '';
    
    // Notifications
    document.getElementById('toggleEmail').checked = settings.emailNotifications !== false;
    document.getElementById('togglePush').checked = settings.pushNotifications === true;
    document.getElementById('toggleWeekly').checked = settings.weeklyReports !== false;
    document.getElementById('toggleSounds').checked = settings.alertSounds !== false;
    
    // Appearance
    document.getElementById('settingTheme').value = settings.theme || 'dark';
    document.getElementById('settingLayout').value = settings.layout || 'grid';
    document.getElementById('settingItemsPerPage').value = settings.itemsPerPage || '50';
    
    // Security
    document.getElementById('toggle2FA').checked = settings.twoFAEnabled === true;
    document.getElementById('setup2FA').style.display = settings.twoFAEnabled ? 'none' : 'none';
}

function saveSheetUrl() {
    const url = document.getElementById('settingSheetUrl').value.trim();
    if (!url) {
        alert('Please enter a valid Google Sheets CSV URL');
        return;
    }
    
    localStorage.setItem('taboost_sheet_url', url);
    
    // Update the data service
    if (typeof taboostData !== 'undefined') {
        taboostData.setSheetUrl(url);
    }
    
    alert('Data source updated! Refresh the page to load from the new source.');
}

function saveProfileSettings() {
    const settings = JSON.parse(localStorage.getItem('creator_settings') || '{}');
    settings.displayName = document.getElementById('settingDisplayName').value;
    settings.email = document.getElementById('settingEmail').value;
    
    localStorage.setItem('creator_settings', JSON.stringify(settings));
    alert('Profile settings saved!');
}

function updatePassword() {
    const currentPass = document.getElementById('settingCurrentPassword').value;
    const newPass = document.getElementById('settingNewPassword').value;
    const confirmPass = document.getElementById('settingConfirmPassword').value;
    
    if (!currentPass || !newPass || !confirmPass) {
        alert('Please fill in all password fields');
        return;
    }
    
    if (newPass !== confirmPass) {
        alert('New passwords do not match');
        return;
    }
    
    if (newPass.length < 8) {
        alert('Password must be at least 8 characters');
        return;
    }
    
    // In production, this would verify current password with backend
    alert('Password updated successfully!');
    
    // Clear fields
    document.getElementById('settingCurrentPassword').value = '';
    document.getElementById('settingNewPassword').value = '';
    document.getElementById('settingConfirmPassword').value = '';
}

function toggle2FA() {
    const enabled = document.getElementById('toggle2FA').checked;
    const setupDiv = document.getElementById('setup2FA');
    
    if (enabled) {
        setupDiv.style.display = 'block';
    } else {
        setupDiv.style.display = 'none';
        const settings = JSON.parse(localStorage.getItem('creator_settings') || '{}');
        settings.twoFAEnabled = false;
        localStorage.setItem('creator_settings', JSON.stringify(settings));
        alert('Two-Factor Authentication disabled');
    }
}

function verify2FA() {
    const code = document.getElementById('setting2FACode').value;
    
    if (code.length !== 6) {
        alert('Please enter a 6-digit verification code');
        return;
    }
    
    // In production, this would verify with backend
    const settings = JSON.parse(localStorage.getItem('creator_settings') || '{}');
    settings.twoFAEnabled = true;
    localStorage.setItem('creator_settings', JSON.stringify(settings));
    
    document.getElementById('setup2FA').style.display = 'none';
    alert('Two-Factor Authentication enabled!');
}

// Save notification and appearance settings on change
document.addEventListener('change', function(e) {
    if (e.target.closest('.settings-modal')) {
        const settings = JSON.parse(localStorage.getItem('creator_settings') || '{}');
        
        // Notifications
        if (e.target.id === 'toggleEmail') settings.emailNotifications = e.target.checked;
        if (e.target.id === 'togglePush') settings.pushNotifications = e.target.checked;
        if (e.target.id === 'toggleWeekly') settings.weeklyReports = e.target.checked;
        if (e.target.id === 'toggleSounds') settings.alertSounds = e.target.checked;
        
        // Appearance
        if (e.target.id === 'settingTheme') settings.theme = e.target.value;
        if (e.target.id === 'settingLayout') settings.layout = e.target.value;
        if (e.target.id === 'settingItemsPerPage') settings.itemsPerPage = e.target.value;
        
        localStorage.setItem('creator_settings', JSON.stringify(settings));
    }
});

// ===== 3x3 ROLLING CALENDAR =====

function updateEventsCalendar() {
    // Use the new rolling calendar data
    const calendarData = typeof getRollingCalendarData === 'function' ? getRollingCalendarData() : 
                         (typeof rollingCalendar !== 'undefined' ? rollingCalendar : null);
    
    if (!calendarData) {
        console.log('Calendar data not available');
        return;
    }
    
    // Update date range header
    const weekEl = document.getElementById('calendarWeek');
    if (weekEl) {
        weekEl.textContent = calendarData.currentDateRange;
    }
    
    // Update TABOOST Campaign Banner
    const bannerEl = document.getElementById('taboostCampaignBanner');
    if (bannerEl && calendarData.taboostCampaigns && calendarData.taboostCampaigns.length > 0) {
        const campaign = calendarData.taboostCampaigns[0];
        const tagHtml = campaign.tagLink 
            ? `<a href="${campaign.tagLink}" target="_blank" class="campaign-tag" style="text-decoration: none; color: #fff;">${campaign.tag}</a>`
            : `<span class="campaign-tag">${campaign.tag}</span>`;
        const nameHtml = campaign.name ? `<span class="campaign-name">${campaign.name}</span>` : '';
        const statusHtml = campaign.status ? `<span class="campaign-status">${campaign.status}</span>` : '';
        bannerEl.innerHTML = `
            <div class="campaign-badge" style="background: ${campaign.color}20; border-color: ${campaign.color};">
                ${tagHtml}
                ${nameHtml}
                ${statusHtml}
            </div>
        `;
    }
    
    // Update 3x3 Rolling Calendar Grid
    const calendarEl = document.getElementById('weeklyCalendar');
    if (calendarEl && calendarData.days) {
        calendarEl.innerHTML = calendarData.days.map((day, index) => {
            const hasEvents = day.events && day.events.length > 0;
            const isToday = day.isToday;
            
            const eventsHtml = day.events.map(evt => {
                let eventClass = `calendar-event ${evt.type}`;
                if (evt.isMultiDay) {
                    eventClass += ' multiday';
                    if (evt.isStart) eventClass += ' multiday-start';
                    else if (evt.isEnd) eventClass += ' multiday-end';
                    else eventClass += ' multiday-middle';
                }
                
                return `
                    <div class="${eventClass}" style="${evt.color ? `border-left-color: ${evt.color}` : ''}">
                        ${evt.isMultiDay ? `<span class="event-status">${evt.time}</span>` : `<span class="event-time-badge">${evt.time}</span>`}
                        <span class="event-title-small">${evt.title}</span>
                    </div>
                `;
            }).join('');
            
            return `
                <div class="calendar-day ${hasEvents ? 'has-events' : ''} ${isToday ? 'is-today' : ''}">
                    <div class="day-header">
                        <span class="day-name">${isToday ? 'TODAY' : day.dayName}</span>
                        <span class="day-date">${day.date}</span>
                    </div>
                    <div class="day-events">
                        ${hasEvents ? eventsHtml : '<span class="no-event">-</span>'}
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Update TikTok Campaigns
    const tiktokEl = document.getElementById('tiktokCampaignsList');
    if (tiktokEl && calendarData.tiktokCampaigns) {
        tiktokEl.innerHTML = calendarData.tiktokCampaigns.map(camp => `
            <div class="tiktok-campaign-item">
                <i class="fas fa-music"></i>
                <div>
                    <span class="campaign-title">${camp.name}</span>
                    <span class="campaign-dates">${camp.dates}</span>
                </div>
            </div>
        `).join('');
    }
}
