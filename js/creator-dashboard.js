function updateGoals() {
    myData.daysGoal = myData.daysGoal || myData.daysMonth || 22;
    myData.hoursGoal = myData.hoursGoal || myData.hoursMonth || 80;
}

function updateStats() {
    myData.rewards.unlocked = myData.unlocked || myData.rewards.available || myData.rewards.unlocked || 0;
    myData.earned = myData.earned || myData.rewards.earned || 0;
    // Keep existing negative formatting behavior
}

function updateScoreAndLevels() {
    if (myData.level == null || myData.level === '') {
        displayLevel('Level --');
    } else if (myData.level === 0) {
        displayLevel('Level 0');
    }
    if (typeof myData.level === 'number') {
        highlightLevelStep();
    }
}

function initPerformanceChart() {
    let tierData = new Array(labels.length).fill(null);
    if (labels.length > 1) {
        tierData[labels.length - 2] = lastMonthTier;
        tierData[labels.length - 1] = thisMonthTier;
    }
}