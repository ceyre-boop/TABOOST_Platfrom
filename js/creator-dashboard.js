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
    
    // Find my data - first try by Creator ID, then fallback to username
    // In production, user.id would be the Creator ID from login
    let creatorId = user.creatorId || user.id;
    
    if (creatorId && creatorIdMap[creatorId]) {
        myData = creatorIdMap[creatorId];
    } else {
        // Fallback: try to match by username
        myData = allCreators.find(c => 
            c.username.toLowerCase() === user.name.toLowerCase().replace(' ', '')
        ) || allCreators.find(c => c.username === 'singleonthemove') || allCreators[0];
    }
    
    // Store creatorId for internal tracking (never displayed)
    myData._creatorId = myData.creatorId;
    
    updateProfile(user);
    updateStats();
    updateGoals();
    updateRank();
    updateActivityStats();
    updateScoreAndLevels();
    initPerformanceChart();
    updateAchievements();
    updateHistory();
    updateAwards();
    
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
    
    // Get real Tier and Score from CSV (column U for Tier, column AF for Score)
    const badgeData = creatorBadges[creatorId] || {};
    const tier = badgeData.tier || '-';
    const score = badgeData.score || 0;
    
    // Manager pill
    document.getElementById('managerName').textContent = myData.manager || 'Not assigned';
    
    // Badges - Level, Tier (col U), Score (col AF)
    document.getElementById('creatorBadges').innerHTML = `
        <span class="badge badge-level">Level ${myData.level || '--'}</span>
        <span class="badge badge-tier">${tier}</span>
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
    document.getElementById('currentDiamonds').textContent = formatNumber(myData.diamonds) + ' 💎';
    document.getElementById('currentUSD').textContent = '≈ ' + formatUSD(myData.diamonds);
    
    // Growth trend
    const growth = parseFloat(myData.growthPercent) || 0;
    const trendEl = document.getElementById('diamondTrend');
    trendEl.innerHTML = `
        <span class="trend-indicator ${growth >= 0 ? 'up' : 'down'}">
            <i class="fas fa-arrow-${growth >= 0 ? 'up' : 'down'}"></i>
            ${Math.abs(growth).toFixed(1)}% vs last month
        </span>
    `;
    
    // Rewards - Column AP (Last Label) for source, Column AG (Unlocked) for total
    const lastLabel = myData.lastRewardLabel || '';
    
    // Extract number from Last Label (e.g., "20K" from "3/02 Monthly Award 20K")
    const numberMatch = lastLabel.match(/([\d,.]+)([KMB]?)/i);
    let lastRewardAmount = '0';
    if (numberMatch) {
        const num = numberMatch[1];
        const suffix = numberMatch[2] || 'K'; // Default to K if no suffix
        lastRewardAmount = num + suffix;
    }
    
    // Extract description from Last Label (e.g., "Monthly Award" from "3/02 Monthly Award 20K")
    const descMatch = lastLabel.replace(/^\d+\/\d+\s*/, '').replace(/\s+[\d,.]+[KMB]?$/, '').trim();
    const lastRewardDesc = descMatch || '-';
    
    // Column AG = Total unlocked (lifetime)
    const totalUnlocked = myData.totalUnlocked || '0';
    
    document.getElementById('totalRewards').textContent = lastRewardAmount;
    document.getElementById('rewardsBreakdown').innerHTML = `
        <span>${lastRewardDesc}</span>
        <span>Unlocked: ${totalUnlocked}</span>
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
    document.getElementById('hoursValue').textContent = (myData.hours || 0).toFixed(1) + 'h';
    document.getElementById('streamsValue').textContent = myData.liveStreams || 0;
    document.getElementById('followersValue').textContent = formatNumber(myData.followers);
    document.getElementById('daysValue').textContent = myData.validLiveDays || 0;
    
    // Hours goal mini bar
    const hourPct = Math.min(100, ((myData.hours || 0) / (myData.hrsGoal || 80)) * 100);
    document.getElementById('hoursFill').style.width = hourPct + '%';
    document.getElementById('hoursGoalText').textContent = (myData.hrsGoal || 80) + 'h';
}

function updateGoals() {
    const daysInMonth = 30;
    const today = new Date().getDate();
    const daysLeft = daysInMonth - today;
    document.getElementById('daysRemaining').textContent = daysLeft + ' days left in month';
    
    const goals = [
        {
            name: 'Hours Goal',
            icon: 'fa-clock',
            current: myData.hours || 0,
            target: myData.hrsGoal || 80,
            unit: 'h'
        },
        {
            name: 'Diamonds Target',
            icon: 'fa-gem',
            current: myData.diamonds || 0,
            target: (myData.diamondsLastMonth || 0) * 1.1,
            unit: ''
        },
        {
            name: 'Streaming Days',
            icon: 'fa-calendar',
            current: myData.liveStreams || 0,
            target: 25,
            unit: ' days'
        }
    ];
    
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

async function loadCreatorTrends() {
    try {
        const response = await fetch('data/creator_trends.json');
        const trends = await response.json();
        creatorTrends = {};
        trends.forEach(t => {
            creatorTrends[t.username] = t;
        });
    } catch (e) {
        console.error('Failed to load trends:', e);
    }
}

function initPerformanceChart() {
    const ctx = document.getElementById('performanceChart');
    
    // Use real 6-month data if available
    const trends = creatorTrends[myData.username];
    const hasRealData = trends && trends.diamondsHistory && trends.diamondsHistory.length === 6;
    
    const labels = hasRealData 
        ? ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'This Month']
        : ['2 Months Ago', 'Last Month', 'This Month'];
    
    const dataPoints = hasRealData
        ? trends.diamondsHistory
        : [
            myData.diamondsTwoMonthsAgo || 0,
            myData.diamondsLastMonth || 0,
            myData.diamonds || 0
        ];
    
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
            pointRadius: hasRealData ? 4 : 6
        }]
    };
    
    // Add growth rate line if we have real 6-month data
    if (hasRealData && trends.growthRates) {
        data.datasets.push({
            label: 'Growth %',
            data: trends.growthRates,
            borderColor: '#00ff88',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [5, 5],
            yAxisID: 'y1',
            tension: 0.4,
            pointRadius: 3
        });
    }
    
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
                    display: hasRealData,
                    labels: { color: '#888' }
                },
                tooltip: {
                    backgroundColor: '#1a1a1a',
                    borderColor: '#333',
                    borderWidth: 1,
                    titleColor: '#fff',
                    bodyColor: '#ccc',
                    callbacks: {
                        label: function(context) {
                            if (context.dataset.label === 'Growth %') {
                                return context.parsed.y + '% growth';
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
                        callback: v => formatNumber(v)
                    }
                },
                y1: hasRealData ? {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { display: false },
                    ticks: {
                        color: '#00ff88',
                        callback: v => v + '%'
                    }
                } : undefined,
                x: {
                    grid: { display: false },
                    ticks: { color: '#888' }
                }
            }
        }
    });
    
    // Chart tabs - only real data, no estimation
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Always show real 6-month historical data
            if (hasRealData) {
                performanceChart.data.labels = ['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5', 'This Month'];
                performanceChart.data.datasets[0].data = trends.diamondsHistory;
                if (performanceChart.data.datasets[1]) {
                    performanceChart.data.datasets[1].data = trends.growthRates;
                }
            } else {
                // Fallback to available data
                performanceChart.data.labels = ['2 Months Ago', 'Last Month', 'This Month'];
                performanceChart.data.datasets[0].data = [
                    myData.diamondsTwoMonthsAgo || 0,
                    myData.diamondsLastMonth || 0,
                    myData.diamonds || 0
                ];
            }
            performanceChart.update();
        });
    });
    
    // Insights using real data
    const avg = allCreators.reduce((a, c) => a + (c.diamonds || 0), 0) / allCreators.length;
    const diff = ((myData.diamonds || 0) - avg) / avg * 100;
    
    let trendInsight = '';
    if (hasRealData && trends.growthRates) {
        const avgGrowth = trends.growthRates.slice(1).reduce((a, b) => a + b, 0) / 5;
        const growthClass = avgGrowth >= 0 ? 'positive' : 'negative';
        trendInsight = `
            <div class="insight-item ${growthClass}">
                <i class="fas fa-chart-line"></i>
                <span>6-month avg growth: ${avgGrowth >= 0 ? '+' : ''}${avgGrowth.toFixed(1)}%</span>
            </div>
        `;
    }
    
    document.getElementById('chartInsights').innerHTML = `
        <div class="insight-item ${diff >= 0 ? 'positive' : 'negative'}">
            <i class="fas fa-chart-bar"></i>
            <span>${diff >= 0 ? '+' : ''}${diff.toFixed(1)}% vs agency average</span>
        </div>
        ${trendInsight}
        <div class="insight-item">
            <i class="fas fa-calculator"></i>
            <span>${formatNumber((myData.diamonds || 0) / (myData.liveStreams || 1))} diamonds per stream</span>
        </div>
    `;
}

function updateAchievements() {
    const achievements = [
        { name: 'Diamond Hoarder', icon: '💎', unlocked: (myData.diamonds || 0) > 1000000, desc: '1M+ diamonds' },
        { name: 'Stream Master', icon: '📺', unlocked: (myData.liveStreams || 0) > 50, desc: '50+ streams' },
        { name: 'Reward King', icon: '💰', unlocked: (myData.rewards?.earned || 0) > 1000000, desc: '1M+ earned' },
        { name: 'Hour Crusher', icon: '⏰', unlocked: (myData.hours || 0) > 100, desc: '100+ hours' },
        { name: 'Growth Star', icon: '🚀', unlocked: parseFloat(myData.growthPercent) > 20, desc: '20%+ growth' },
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
    const rows = [
        {
            period: 'Feb 2026',
            diamonds: myData.diamonds,
            usd: formatUSD(myData.diamonds),
            hours: (myData.hours || 0).toFixed(1) + 'h',
            rewards: formatNumber(myData.rewards?.earned || 0),
            change: myData.growthPercent || '0%'
        },
        {
            period: 'Jan 2026',
            diamonds: myData.diamondsLastMonth,
            usd: formatUSD(myData.diamondsLastMonth),
            hours: '--',
            rewards: '--',
            change: '--'
        },
        {
            period: 'Dec 2025',
            diamonds: myData.diamondsTwoMonthsAgo,
            usd: formatUSD(myData.diamondsTwoMonthsAgo),
            hours: '--',
            rewards: '--',
            change: '--'
        }
    ];
    
    document.getElementById('historyTableBody').innerHTML = rows.map(r => {
        const changeNum = parseFloat(r.change);
        const changeClass = isNaN(changeNum) ? '' : changeNum >= 0 ? 'up' : 'down';
        const changeIcon = isNaN(changeNum) ? '' : changeNum >= 0 ? 'fa-arrow-up' : 'fa-arrow-down';
        
        return `
            <tr>
                <td><strong>${r.period}</strong></td>
                <td>${formatNumber(r.diamonds)} 💎</td>
                <td style="color: var(--success);">${r.usd}</td>
                <td>${r.hours}</td>
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
    // Score from Google Sheets (0-100)
    const score = myData.score || 0;
    
    // Update Score Badge
    document.getElementById('scoreBadge').textContent = `Score: ${score}`;
    
    // Score Bar Fill (0-100 scale)
    document.getElementById('scoreBarFill').style.width = `${Math.min(100, score)}%`;
    
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
    
    const currentTier = rewardTiers.find(t => score >= t.min);
    const nextTier = rewardTiers.find(t => t.min > score);
    
    document.getElementById('currentScoreReward').textContent = 
        score >= 70 ? `Current Reward: $${currentTier.reward}` : 'Need 70+ score for rewards';
    document.getElementById('nextScoreReward').textContent = 
        nextTier ? `Next: $${nextTier.reward} at ${nextTier.min}` : 'Max reward achieved!';
    
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
    document.getElementById('scoreTrend').textContent = growth >= 0 ? `+${growth}%` : `${growth}%`;
    document.getElementById('scoreTrend').style.color = growth >= 0 ? 'var(--taboost-success)' : 'var(--taboost-red)';
    
    // Activity Level Visual
    const currentLevel = myData.level || 1;
    document.getElementById('currentLevelBadge').textContent = `Level ${currentLevel}`;
    
    // Update level steps
    document.querySelectorAll('.level-step').forEach(step => {
        const levelNum = parseInt(step.dataset.level);
        step.classList.remove('completed', 'current');
        if (levelNum < currentLevel) {
            step.classList.add('completed');
        } else if (levelNum === currentLevel) {
            step.classList.add('current');
        }
    });
    
    // Current progress toward next level
    const levelReqs = [
        { level: 1, days: 8, hours: 8 },
        { level: 2, days: 12, hours: 20 },
        { level: 3, days: 16, hours: 35 },
        { level: 4, days: 20, hours: 50 },
        { level: 5, days: 25, hours: 70 }
    ];
    
    const nextLevelReq = levelReqs.find(r => r.level === currentLevel + 1) || levelReqs[4];
    const currentDays = myData.validLiveDays || 0;
    const currentHours = myData.hours || 0;
    
    document.getElementById('daysStreamed').textContent = `${currentDays} / ${nextLevelReq.days} days`;
    document.getElementById('hoursStreamedLevel').textContent = `${currentHours.toFixed(1)} / ${nextLevelReq.hours} hrs`;
    
    document.getElementById('daysFill').style.width = `${Math.min(100, (currentDays / nextLevelReq.days) * 100)}%`;
    document.getElementById('hoursFillLevel').style.width = `${Math.min(100, (currentHours / nextLevelReq.hours) * 100)}%`;
    
    // Revenue Streams
    const levelPayments = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; // Update with actual values
    const scorePayment = currentTier ? currentTier.reward : 0;
    const diamondUSD = (myData.diamonds || 0) * 0.005;
    
    document.getElementById('levelRevenue').textContent = '$' + (levelPayments[currentLevel] || 0);
    document.getElementById('revenueLevelNum').textContent = currentLevel;
    document.getElementById('diamondRevenue').textContent = '$' + diamondUSD.toFixed(2);
    document.getElementById('diamondCount').textContent = formatNumber(myData.diamonds) + ' 💎';
    document.getElementById('scoreRevenue').textContent = '$' + scorePayment;
    document.getElementById('revenueScoreNum').textContent = score;
    
    // Total potential
    const total = (levelPayments[currentLevel] || 0) + diamondUSD + scorePayment;
    document.getElementById('totalPotential').textContent = '$' + total.toFixed(2);
}

function updateAwards() {
    const awards = [];
    
    if (myData.lastLabel) {
        awards.push({
            icon: '🏆',
            title: myData.lastLabel,
            date: 'Recent',
            amount: 'Award'
        });
    }
    
    if ((myData.rewards?.bonus || 0) > 0) {
        awards.push({
            icon: '🎁',
            title: 'Performance Bonus',
            date: 'This month',
            amount: formatNumber(myData.rewards.bonus)
        });
    }
    
    if (awards.length === 0) {
        awards.push({
            icon: '⭐',
            title: 'Keep streaming to earn awards!',
            date: '',
            amount: ''
        });
    }
    
    document.getElementById('awardsList').innerHTML = awards.map(a => `
        <div class="award-item">
            <div class="award-icon">${a.icon}</div>
            <div class="award-content">
                <div class="award-title">${a.title}</div>
                <div class="award-date">${a.date}</div>
            </div>
            <div class="award-amount">${a.amount}</div>
        </div>
    `).join('');
}
