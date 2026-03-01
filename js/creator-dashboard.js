// Creator Dashboard - Personal Analytics

let myData = null;
let allCreators = [];
let performanceChart = null;

async function initCreatorDashboard(user) {
    await taboostData.loadFromCSV();
    allCreators = taboostData.getAllCreators();
    
    // Find my data - match by username from login
    myData = allCreators.find(c => 
        c.username.toLowerCase() === user.name.toLowerCase().replace(' ', '')
    ) || allCreators.find(c => c.username === 'singleonthemove') || allCreators[0];
    
    updateProfile(user);
    updateStats();
    updateGoals();
    updateRank();
    updateActivityStats();
    updateScoreAndLevels(); // NEW: Score & Activity Level
    initPerformanceChart();
    updateAchievements();
    updateHistory();
    updateAwards();
    
    // Update footer manager
    document.getElementById('footerManager').textContent = myData.manager || 'your manager';
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
    document.getElementById('joinDate').textContent = new Date(myData.joinedTime || Date.now()).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
    });
    
    // Manager pill
    document.getElementById('managerName').textContent = myData.manager || 'Not assigned';
    
    // Badges
    const tier = getTier(myData.diamonds);
    document.getElementById('creatorBadges').innerHTML = `
        <span class="badge badge-level">Level ${myData.level || '--'}</span>
        <span class="badge badge-tier">${tier} Tier</span>
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
    
    // Rewards
    const totalRewards = (myData.rewards?.earned || 0) + (myData.rewards?.bonus || 0);
    document.getElementById('totalRewards').textContent = formatNumber(totalRewards);
    document.getElementById('rewardsBreakdown').innerHTML = `
        <span>Earned: ${formatNumber(myData.rewards?.earned || 0)}</span>
        <span>Bonus: ${formatNumber(myData.rewards?.bonus || 0)}</span>
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
        document.getElementById('rankGoal').textContent = formatNumber(gap) + ' more diamonds to pass ' + nextCreator.username;
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

function initPerformanceChart() {
    const ctx = document.getElementById('performanceChart');
    
    const data = {
        labels: ['2 Months Ago', 'Last Month', 'This Month'],
        datasets: [{
            label: 'My Diamonds',
            data: [
                myData.diamondsTwoMonthsAgo || 0,
                myData.diamondsLastMonth || 0,
                myData.diamonds || 0
            ],
            borderColor: '#ff0044',
            backgroundColor: 'rgba(255, 0, 68, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 3
        }]
    };
    
    performanceChart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        color: '#888',
                        callback: v => formatNumber(v)
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#888' }
                }
            }
        }
    });
    
    // Chart tabs
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            if (this.dataset.period === 'history') {
                // Show 3 month view (already default)
                performanceChart.data.labels = ['2 Months Ago', 'Last Month', 'This Month'];
                performanceChart.data.datasets[0].data = [
                    myData.diamondsTwoMonthsAgo || 0,
                    myData.diamondsLastMonth || 0,
                    myData.diamonds || 0
                ];
            } else {
                // Simulate daily breakdown for "This Month"
                const daily = [];
                const labels = [];
                const avg = (myData.diamonds || 0) / 25;
                for (let i = 1; i <= 7; i++) {
                    daily.push(Math.floor(avg * (0.7 + Math.random() * 0.6)));
                    labels.push('Day ' + i);
                }
                performanceChart.data.labels = labels;
                performanceChart.data.datasets[0].data = daily;
            }
            performanceChart.update();
        });
    });
    
    // Insights
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
    
    document.getElementById('scoreActivity').textContent = `Level ${myData.level || 1}`;
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
